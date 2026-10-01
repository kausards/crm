import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { getSteadfastStatus } from '@/lib/courier/steadfast';
import { getPathaoStatus } from '@/lib/courier/pathao';
import { getRedXStatus } from '@/lib/courier/redx';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  return handleSync(req);
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const providerFilter = searchParams.get('provider'); // optional 'steadfast' | 'pathao' | 'redx'
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // 1. Fetch credentials for all active providers for this tenant
    const { data: credsList, error: credsErr } = await supabase
      .from('courier_credentials')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true);

    if (credsErr) throw credsErr;

    const credsMap = new Map<string, { apiKey: string; secretKey?: string | null }>();
    for (const c of credsList || []) {
      try {
        const apiKey = decrypt(c.encrypted_api_key);
        const secretKey = c.encrypted_api_secret ? decrypt(c.encrypted_api_secret) : null;
        credsMap.set(c.provider, { apiKey, secretKey });
      } catch (decErr) {
        console.warn(`Failed to decrypt credentials for provider ${c.provider}:`, decErr);
      }
    }

    // 2. Fetch active shipments linked to orders that are not terminal (not delivered, returned, cancelled)
    let shipmentQuery = supabase
      .from('courier_shipments')
      .select('id, consignment_id, provider, status, order_id, orders!inner(id, status, delivery_charge, order_items(product_id, quantity))')
      .eq('tenant_id', auth.tenantId)
      .in('orders.status', ['confirmed', 'packed', 'shipped', 'on_hold']);

    if (providerFilter && ['steadfast', 'pathao', 'redx'].includes(providerFilter)) {
      shipmentQuery = shipmentQuery.eq('provider', providerFilter);
    }

    const { data: shipments, error: shipErr } = await shipmentQuery.limit(limit);
    if (shipErr) throw shipErr;

    let syncedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const errors: string[] = [];

    for (const shipment of shipments || []) {
      const provider = shipment.provider;
      const creds = credsMap.get(provider);

      if (!creds) {
        errors.push(`Shipment ${shipment.consignment_id}: No active credentials found for ${provider}`);
        continue;
      }

      try {
        let courierStatus = '';
        if (provider === 'steadfast') {
          const res = await getSteadfastStatus(creds, shipment.consignment_id);
          courierStatus = res.status;
        } else if (provider === 'pathao') {
          const res = await getPathaoStatus(creds, shipment.consignment_id);
          courierStatus = res.status;
        } else if (provider === 'redx') {
          const res = await getRedXStatus(creds, shipment.consignment_id);
          courierStatus = res.status;
        }

        syncedCount++;

        const statusText = (courierStatus || '').toLowerCase();
        let mappedStatus: 'confirmed' | 'shipped' | 'delivered' | 'returned' | null = null;

        if (statusText.includes('deliver') || statusText === 'successful') {
          mappedStatus = 'delivered';
        } else if (statusText.includes('return') || statusText.includes('cancel') || statusText === 'rto') {
          mappedStatus = 'returned';
        } else if (statusText.includes('transit') || statusText.includes('shipped') || statusText.includes('picked')) {
          mappedStatus = 'shipped';
        }

        // Update shipment last_synced_at and raw status
        await supabase
          .from('courier_shipments')
          .update({
            status: statusText || 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        const order = shipment.orders as unknown as {
          id: string;
          status: string;
          delivery_charge: number;
          order_items: Array<{ product_id: string; quantity: number }>;
        };

        if (mappedStatus && order && order.status !== mappedStatus) {
          // Update order status
          await supabase
            .from('orders')
            .update({
              status: mappedStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          updatedCount++;

          // If transitioning to returned, restore inventory and log return cost
          if (mappedStatus === 'returned' && order.status !== 'returned') {
            for (const item of order.order_items || []) {
              await logStockMovement({
                supabase,
                tenantId: auth.tenantId,
                productId: item.product_id,
                direction: 'in',
                quantity: item.quantity,
                reason: 'order_return',
                referenceId: order.id,
              });
            }

            const returnCostAmount = Number(order.delivery_charge) || 120;
            await supabase.from('bill_costs').insert({
              tenant_id: auth.tenantId,
              name: `Return Cost - Order #${order.id.slice(0, 8)}`,
              amount: returnCostAmount,
              date: new Date().toISOString().slice(0, 10),
              category: 'return_cost',
              is_recurring: false,
            });
          }
        } else {
          unchangedCount++;
        }
      } catch (err: unknown) {
        errors.push(`Shipment ${shipment.consignment_id} error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return successResponse({
      message: 'Courier sync completed',
      synced: syncedCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      total_checked: (shipments || []).length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
