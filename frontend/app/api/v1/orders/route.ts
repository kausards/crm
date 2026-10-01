import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createOrderSchema } from '@/lib/validators/order';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { checkSteadfastCustomerRisk } from '@/lib/courier/steadfast';
import { successResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status');
    const phone = searchParams.get('phone');
    const flaggedOnly = searchParams.get('flagged') === 'true';

    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku))', { count: 'exact' })
      .eq('tenant_id', auth.tenantId);

    if (status) {
      query = query.eq('status', status as unknown as 'pending');
    }

    if (phone) {
      query = query.ilike('customer_phone', `%${phone}%`);
    }

    if (flaggedOnly) {
      query = query.eq('is_flagged', true);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: orders, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(orders || [], {
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    const supabase = await createClient();

    // 1. Fetch products to get buy_price and verify existence
    const productIds = validated.items.map(i => i.product_id);
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, buy_price, sell_price, stock_quantity')
      .in('id', productIds)
      .eq('tenant_id', auth.tenantId);

    if (prodErr || !products || products.length !== productIds.length) {
      return errorResponse('BAD_REQUEST', 'One or more items in the order do not exist in inventory', 400);
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // 2. Compute order totals
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
        tenant_id: auth.tenantId,
        product_id: item.product_id,
        quantity: item.quantity,
        buy_price: Number(prod.buy_price),
        sell_price: item.sell_price,
      });
    }

    const deliveryCharge = validated.delivery_charge || 0;
    const totalAmount = itemsTotal + deliveryCharge;
    const codAmount = totalAmount; // Default COD collects full amount

    // 3. Fraud / High-Return Risk Check (display flag only, never auto-blocks)
    let isFlagged = false;
    let flagReason: string | null = null;

    try {
      const { data: courierCreds } = await supabase
        .from('courier_credentials')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('provider', 'steadfast')
        .eq('is_active', true)
        .single();

      if (courierCreds) {
        const apiKey = decrypt(courierCreds.encrypted_api_key);
        const secretKey = courierCreds.encrypted_api_secret ? decrypt(courierCreds.encrypted_api_secret) : null;

        const risk = await checkSteadfastCustomerRisk(
          { apiKey, secretKey },
          validated.customer_phone
        );

        if (risk.is_flagged) {
          isFlagged = true;
          flagReason = risk.reason || 'High return history flagged by courier';
        }
      }
    } catch (riskErr) {
      console.warn('Courier risk check skipped or failed:', riskErr);
    }

    // 4. Insert order
    const initialStatus = isFlagged ? 'flagged' : 'pending';

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        tenant_id: auth.tenantId,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        customer_address: validated.customer_address,
        status: initialStatus,
        total_amount: totalAmount,
        cod_amount: codAmount,
        delivery_charge: deliveryCharge,
        notes: validated.notes || null,
        is_flagged: isFlagged,
        flag_reason: flagReason,
        courier_provider: validated.courier_provider || null,
      })
      .select('*')
      .single();

    if (orderErr || !order) {
      return errorResponse('INTERNAL_ERROR', orderErr?.message || 'Failed to create order', 500);
    }

    // 5. Insert order items
    const itemsWithOrderId = orderItemsToInsert.map(i => ({ ...i, order_id: order.id }));
    const { error: itemsErr } = await supabase.from('order_items').insert(itemsWithOrderId);

    if (itemsErr) {
      console.error('Failed to insert order items, rolling back order:', itemsErr);
      // Compensating delete to avoid orphaned order with no items
      await supabase.from('orders').delete().eq('id', order.id);
      return errorResponse('INTERNAL_ERROR', 'Failed to save order items. Order was rolled back.', 500);
    }

    return successResponse({
      order,
      items: itemsWithOrderId,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
