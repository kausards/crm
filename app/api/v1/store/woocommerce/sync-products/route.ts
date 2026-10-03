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
    const productsUrl = `${storeUrl}/wp-json/wc/v3/products?per_page=50&status=publish`;

    const wcRes = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'User-Agent': 'NexusFlow-CRM/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!wcRes.ok) {
      return errorResponse('BAD_REQUEST', `WooCommerce API returned status ${wcRes.status} during product sync`, 400);
    }

    const wcProducts: any[] = await wcRes.json();
    if (!Array.isArray(wcProducts)) {
      return successResponse({ importedCount: 0, updatedCount: 0, message: 'No products found' });
    }

    let importedCount = 0;
    let updatedCount = 0;

    for (const prod of wcProducts) {
      const prodName = prod.name || 'Unnamed Product';
      const prodSku = prod.sku || `WC-${prod.id}`;
      const sellPrice = Number(prod.price || prod.regular_price || 0);
      const stockQty = typeof prod.stock_quantity === 'number' ? prod.stock_quantity : 50;

      // Check if product exists by SKU or name
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .or(`sku.eq.${prodSku},name.eq.${prodName}`)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('products')
          .update({
            sell_price: sellPrice > 0 ? sellPrice : undefined,
            stock_quantity: stockQty,
            is_active: true,
          })
          .eq('id', existing.id);
        updatedCount++;
      } else {
        await supabaseAdmin.from('products').insert({
          tenant_id: auth.tenantId,
          name: prodName,
          sku: prodSku,
          buy_price: 0,
          sell_price: sellPrice,
          stock_quantity: stockQty,
          low_stock_threshold: 5,
          is_active: true,
        });
        importedCount++;
      }
    }

    return successResponse({
      importedCount,
      updatedCount,
      totalChecked: wcProducts.length,
      message: `Imported ${importedCount} new product(s) and updated ${updatedCount} existing product(s) from WooCommerce into your CRM catalog.`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
