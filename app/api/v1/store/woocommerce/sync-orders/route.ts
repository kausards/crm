import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();

    // Fetch tenant WooCommerce credentials
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('id, woo_store_url, woo_consumer_key, woo_consumer_secret, woo_is_connected')
      .eq('id', auth.tenantId)
      .single();

    if (tenantErr || !tenant || !tenant.woo_is_connected || !tenant.woo_consumer_key || !tenant.woo_consumer_secret) {
      return errorResponse('BAD_REQUEST', 'WooCommerce store is not connected. Please connect with your Consumer Key & Secret first.', 400);
    }

    const consumerKey = decrypt(tenant.woo_consumer_key);
    const consumerSecret = decrypt(tenant.woo_consumer_secret);
    const storeUrl = tenant.woo_store_url;

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const ordersUrl = `${storeUrl}/wp-json/wc/v3/orders?status=processing,pending,on-hold&per_page=25&orderby=date&order=desc`;

    const wcRes = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'User-Agent': 'NexusFlow-CRM/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!wcRes.ok) {
      return errorResponse('BAD_REQUEST', `WooCommerce API returned status ${wcRes.status} during order sync`, 400);
    }

    const wcOrders: any[] = await wcRes.json();
    if (!Array.isArray(wcOrders)) {
      return successResponse({ importedCount: 0, skippedCount: 0, message: 'No orders found' });
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Fetch existing active products for matching
    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, buy_price, sell_price')
      .eq('tenant_id', auth.tenantId);

    const productList = existingProducts || [];

    for (const wcOrder of wcOrders) {
      const wooRef = `WooCommerce Order #${wcOrder.id}`;

      // Check if order already imported
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .ilike('notes', `%${wooRef}%`)
        .maybeSingle();

      if (existingOrder) {
        skippedCount++;
        continue;
      }

      const customerName =
        `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim() ||
        `${wcOrder.shipping?.first_name || ''} ${wcOrder.shipping?.last_name || ''}`.trim() ||
        'WooCommerce Customer';

      const customerPhone =
        wcOrder.billing?.phone?.trim() || '01700000000';

      const customerAddress =
        [
          wcOrder.shipping?.address_1,
          wcOrder.shipping?.address_2,
          wcOrder.shipping?.city,
          wcOrder.shipping?.state,
        ]
          .filter(Boolean)
          .join(', ') ||
        [wcOrder.billing?.address_1, wcOrder.billing?.city].filter(Boolean).join(', ') ||
        'Address not provided';

      const deliveryCharge = Number(wcOrder.shipping_total) || 0;
      const orderTotal = Number(wcOrder.total) || 0;

      // Insert order
      const { data: insertedOrder, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          tenant_id: auth.tenantId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          status: 'pending',
          total_amount: orderTotal,
          cod_amount: orderTotal,
          delivery_charge: deliveryCharge,
          notes: `${wooRef} (${wcOrder.status})`,
        })
        .select('id')
        .single();

      if (orderErr || !insertedOrder) {
        continue;
      }

      // Map line items
      const lineItems = wcOrder.line_items || [];
      const orderItemsToInsert: Array<{
        tenant_id: string;
        order_id: string;
        product_id: string;
        quantity: number;
        buy_price: number;
        sell_price: number;
      }> = [];

      for (const item of lineItems) {
        let matched = productList.find(
          (p) =>
            (item.sku && p.sku?.toLowerCase() === item.sku?.toLowerCase()) ||
            p.name?.toLowerCase() === item.name?.toLowerCase()
        );

        if (!matched) {
          const itemPrice = Number(item.price) || (Number(item.total) / (item.quantity || 1)) || 100;
          const { data: newProd } = await supabaseAdmin
            .from('products')
            .insert({
              tenant_id: auth.tenantId,
              name: item.name || 'WooCommerce Product',
              sku: item.sku || `WC-${item.product_id || Date.now().toString().slice(-6)}`,
              buy_price: 0,
              sell_price: itemPrice,
              stock_quantity: 100,
              is_active: true,
            })
            .select('id, buy_price, sell_price')
            .single();

          if (newProd) {
            matched = newProd as any;
            productList.push(newProd as any);
          }
        }

        if (matched) {
          orderItemsToInsert.push({
            tenant_id: auth.tenantId,
            order_id: insertedOrder.id,
            product_id: matched.id,
            quantity: item.quantity || 1,
            buy_price: Number(matched.buy_price) || 0,
            sell_price: Number(item.price) || Number(matched.sell_price) || 0,
          });
        }
      }

      if (orderItemsToInsert.length > 0) {
        await supabaseAdmin.from('order_items').insert(orderItemsToInsert);
      }

      importedCount++;
    }

    // Update last synced at timestamp
    await supabaseAdmin
      .from('tenants')
      .update({ woo_last_synced_at: new Date().toISOString() })
      .eq('id', auth.tenantId);

    return successResponse({
      importedCount,
      skippedCount,
      totalChecked: wcOrders.length,
      message: `Successfully synced ${importedCount} new order(s) from WooCommerce (${skippedCount} already synced).`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
