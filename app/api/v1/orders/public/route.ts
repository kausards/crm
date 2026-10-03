import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publicOrderLimiter, getClientIp } from '@/lib/rateLimit';
import { handleApiError } from '@/lib/apiResponse';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

const publicOrderItemSchema = z.object({
  product_id: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  quantity: z.number().int().positive('Quantity must be greater than 0').default(1),
  sell_price: z.number().min(0, 'Price cannot be negative').default(0),
});

const publicOrderSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  customer_name: z.string().min(1, 'Name is required').max(100),
  customer_phone: z.string().min(10, 'Valid phone is required').max(20),
  customer_address: z.string().min(5, 'Delivery address is required').max(500),
  delivery_charge: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(publicOrderItemSchema).min(1, 'At least one item required'),
});

// GET: Fetch active products for a store (used by external storefronts and landing page forms)
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing tenant_id parameter' } },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, sell_price, stock_quantity, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: 'Failed to fetch store products' } },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: products || [] },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

// POST: Public Checkout Ingestion for external websites and landing pages
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitCheck = await publicOrderLimiter.limit(`public_order_${ip}`);
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please wait a moment before trying again.',
          },
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const body = await req.json();
    const validated = publicOrderSchema.parse(body);

    // Verify tenant exists and is active
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, subscription_status, business_name')
      .eq('id', validated.tenant_id)
      .single();

    if (!tenant || tenant.subscription_status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store is currently unavailable for web orders',
          },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Resolve or auto-register order items
    let itemsTotal = 0;
    const orderItemsToInsert: Array<{
      tenant_id: string;
      product_id: string;
      quantity: number;
      buy_price: number;
      sell_price: number;
    }> = [];

    // Fetch existing products for this tenant
    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, buy_price, sell_price')
      .eq('tenant_id', validated.tenant_id);

    const productList = existingProducts || [];

    for (const item of validated.items) {
      let matchedProduct = null;

      // 1. Try matching by UUID
      if (item.product_id) {
        matchedProduct = productList.find((p) => p.id === item.product_id);
      }

      // 2. Try matching by SKU
      if (!matchedProduct && item.sku) {
        matchedProduct = productList.find(
          (p) => p.sku?.toLowerCase() === item.sku?.toLowerCase()
        );
      }

      // 3. Try matching by Name
      if (!matchedProduct && item.name) {
        matchedProduct = productList.find(
          (p) => p.name?.toLowerCase() === item.name?.toLowerCase()
        );
      }

      // 4. If still no product matched, auto-register item in catalog so web order is NEVER lost
      if (!matchedProduct) {
        const fallbackName = item.name || (item.sku ? `SKU: ${item.sku}` : 'Website Product');
        const fallbackSku = item.sku || `WEB-${Date.now().toString().slice(-6)}`;
        const fallbackPrice = item.sell_price > 0 ? item.sell_price : 100;

        const { data: newProd, error: prodErr } = await supabaseAdmin
          .from('products')
          .insert({
            tenant_id: validated.tenant_id,
            name: fallbackName,
            sku: fallbackSku,
            buy_price: 0,
            sell_price: fallbackPrice,
            stock_quantity: 100,
            low_stock_threshold: 5,
            is_active: true,
          })
          .select('id, buy_price, sell_price')
          .single();

        if (prodErr || !newProd) {
          // If insert fails (e.g. schema constraint), use first existing product if available
          if (productList.length > 0) {
            matchedProduct = productList[0];
          } else {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Failed to record product for order',
                },
              },
              { status: 500, headers: CORS_HEADERS }
            );
          }
        } else {
          matchedProduct = newProd;
          productList.push(newProd as unknown as (typeof productList)[0]);
        }
      }

      const unitSellPrice = item.sell_price > 0 ? item.sell_price : Number(matchedProduct.sell_price) || 0;
      itemsTotal += item.quantity * unitSellPrice;

      orderItemsToInsert.push({
        tenant_id: validated.tenant_id,
        product_id: matchedProduct.id,
        quantity: item.quantity,
        buy_price: Number(matchedProduct.buy_price) || 0,
        sell_price: unitSellPrice,
      });
    }

    const totalAmount = itemsTotal + (validated.delivery_charge || 0);

    // Insert order into NexusFlow CRM
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: validated.tenant_id,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        customer_address: validated.customer_address,
        status: 'pending',
        total_amount: totalAmount,
        cod_amount: totalAmount,
        delivery_charge: validated.delivery_charge || 0,
        notes: validated.notes || 'Website Checkout',
      })
      .select('id, total_amount, status, created_at')
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to place order in CRM' },
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Insert order items
    await supabaseAdmin.from('order_items').insert(
      orderItemsToInsert.map((i) => ({ ...i, order_id: order.id }))
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Order placed successfully into NexusFlow CRM',
          orderId: order.id,
          totalAmount: order.total_amount,
          status: order.status,
          createdAt: order.created_at,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
