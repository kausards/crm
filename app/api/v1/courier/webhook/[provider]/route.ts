import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { timingSafeCompare, decrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['steadfast', 'pathao', 'redx'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (!VALID_PROVIDERS.includes(provider)) {
      return errorResponse('BAD_REQUEST', `Unsupported courier provider: ${provider}`, 400);
    }

    // Read raw body for HMAC signature verification
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse('BAD_REQUEST', 'Malformed JSON payload in webhook body', 400);
    }

    // Provider specific consignment identification
    let consignmentId: string | null = null;
    let courierStatus: string | null = null;

    if (provider === 'steadfast') {
      consignmentId = String(body.consignment_id || body.order_id || '');
      courierStatus = String(body.status || body.notification_type || '').toLowerCase();
    } else if (provider === 'pathao') {
      consignmentId = String(body.consignment_id || '');
      courierStatus = String(body.order_status || '').toLowerCase();
    } else if (provider === 'redx') {
      consignmentId = String(body.tracking_id || body.parcel_id || '');
      courierStatus = String(body.status || '').toLowerCase();
    }

    if (!consignmentId) {
      return errorResponse('BAD_REQUEST', 'Missing consignment identification in webhook', 400);
    }

    // Global Webhook authorization check if COURIER_WEBHOOK_SECRET is set
    const configuredSecret = process.env.COURIER_WEBHOOK_SECRET;
    const incomingSignature =
      req.headers.get('x-steadfast-signature') ||
      req.headers.get('x-pathao-signature') ||
      req.headers.get('x-webhook-secret') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      new URL(req.url).searchParams.get('secret') ||
      '';

    if (configuredSecret) {
      const expectedHmac = crypto.createHmac('sha256', configuredSecret).update(rawBody).digest('hex');
      const isDirectSecretValid = timingSafeCompare(incomingSignature, configuredSecret);
      const isHmacValid = timingSafeCompare(incomingSignature, expectedHmac);

      if (!isDirectSecretValid && !isHmacValid) {
        return errorResponse('UNAUTHORIZED', 'Invalid or missing webhook signature/secret', 401);
      }
    }

    // 1. Find linked shipment
    const { data: shipment } = await supabaseAdmin
      .from('courier_shipments')
      .select('*, orders(*, order_items(*))')
      .eq('consignment_id', consignmentId)
      .eq('provider', provider)
      .single();

    if (!shipment || !shipment.orders) {
      return errorResponse('NOT_FOUND', 'Shipment or linked order not found', 404);
    }

    const order = shipment.orders;
    const tenantId = shipment.tenant_id;

    // 2. Map courier status to order status
    const statusText = (courierStatus || '').toLowerCase();
    let mappedStatus: string = order.status;
    let isDelivered = false;
    let isReturned = false;

    if (statusText.includes('deliver') || statusText === 'successful') {
      mappedStatus = 'delivered';
      isDelivered = true;
    } else if (statusText.includes('return') || statusText.includes('cancel') || statusText === 'rto') {
      mappedStatus = 'returned';
      isReturned = true;
    } else if (statusText.includes('transit') || statusText.includes('shipped')) {
      mappedStatus = 'shipped';
    }

    // 3. Update shipment record
    await supabaseAdmin
      .from('courier_shipments')
      .update({
        status: statusText || 'updated',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', shipment.id);

    // 4. Update order status if changed
    if (order.status !== mappedStatus) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: mappedStatus as unknown as 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    // 5. If RETURNED/RTO and not previously recorded as returned:
    // a) Restore stock deterministically
    // b) Log return cost into bill_costs (category: 'return_cost')
    if (isReturned && order.status !== 'returned') {
      for (const item of order.order_items || []) {
        await logStockMovement({
          supabase: supabaseAdmin,
          tenantId,
          productId: item.product_id,
          direction: 'in',
          quantity: item.quantity,
          reason: 'order_return',
          referenceId: order.id,
        });
      }

      // Return cost = delivery charge lost / return penalty
      const returnCostAmount = Number(order.delivery_charge) || 120; // Default BD courier roundtrip cost if not set

      await supabaseAdmin.from('bill_costs').insert({
        tenant_id: tenantId,
        name: `Return Cost - Order #${order.id.slice(0, 8)}`,
        amount: returnCostAmount,
        date: new Date().toISOString().slice(0, 10),
        category: 'return_cost',
        is_recurring: false,
      });
    }

    return successResponse({
      received: true,
      provider,
      consignmentId,
      status: mappedStatus,
      isDelivered,
      isReturned,
    });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return errorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown webhook error', 500);
  }
}
