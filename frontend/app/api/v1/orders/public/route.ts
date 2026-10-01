import { NextRequest } from 'next/server';
import { z } from 'zod';
import { orderItemSchema } from '@/lib/validators/order';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publicOrderLimiter } from '@/lib/rateLimit';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

const publicOrderSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  customer_name: z.string().min(1, 'Name is required').max(100),
  customer_phone: z.string().min(10, 'Valid phone is required').max(20),
  customer_address: z.string().min(5, 'Delivery address is required').max(500),
  delivery_charge: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'At least one item required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const limitCheck = await publicOrderLimiter.limit(`public_order_${ip}`);
    if (!limitCheck.success) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests. Please wait a moment before trying again.', 429);
    }

    const body = await req.json();
    const validated = publicOrderSchema.parse(body);

    // Verify tenant exists and is active
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, subscription_status')
      .eq('id', validated.tenant_id)
      .single();

    if (!tenant || tenant.subscription_status === 'cancelled') {
      return errorResponse('BAD_REQUEST', 'Store is currently unavailable for orders', 400);
    }

    // Fetch product prices
    const productIds = validated.items.map(i => i.product_id);
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, buy_price, sell_price')
      .in('id', productIds)
      .eq('tenant_id', validated.tenant_id)
      .eq('is_active', true);

    if (!products || products.length !== productIds.length) {
      return errorResponse('BAD_REQUEST', 'One or more items are currently unavailable', 400);
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    let itemsTotal = 0;
    const orderItemsToInsert: Array<{
      tenant_id: string;
      product_id: string;
      quantity: number;
      buy_price: number;
      sell_price: number;
    }> = [];

    for (const item of validated.items) {
      const prod = productMap.get(item.product_id)!;
      itemsTotal += item.quantity * item.sell_price;
      orderItemsToInsert.push({
        tenant_id: validated.tenant_id,
        product_id: item.product_id,
        quantity: item.quantity,
        buy_price: Number(prod.buy_price),
        sell_price: item.sell_price,
      });
    }

    const totalAmount = itemsTotal + (validated.delivery_charge || 0);

    // Insert order
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
      return errorResponse('INTERNAL_ERROR', 'Failed to place order', 500);
    }

    // Insert order items
    await supabaseAdmin.from('order_items').insert(
      orderItemsToInsert.map(i => ({ ...i, order_id: order.id }))
    );

    return successResponse({
      message: 'Order placed successfully',
      orderId: order.id,
      totalAmount: order.total_amount,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
