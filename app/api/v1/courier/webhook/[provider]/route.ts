import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { timingSafeCompare, decrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['steadfast', 'pathao', 'redx'];
const ALLOWED_SHIPMENT_STATUSES = ['pending', 'in_transit', 'delivered', 'returned', 'cancelled', 'dispatched'];

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

    // Provider-specific consignment identification
    let consignmentId: string | null = null;
    let courierStatus: string | null = null;

    if (provider === 'steadfast') {
      consignmentId = String(body.consignment_id || body.order_id || '').trim();
      courierStatus = String(body.status || body.notification_type || '').toLowerCase().trim();
    } else if (provider === 'pathao') {
      consignmentId = String(body.consignment_id || '').trim();
      courierStatus = String(body.order_status || '').toLowerCase().trim();
    } else if (provider === 'redx') {
      consignmentId = String(body.tracking_id || body.parcel_id || '').trim();
      courierStatus = String(body.status || '').toLowerCase().trim();
    }

    if (!consignmentId || !/^[a-zA-Z0-9_\-\.]+$/.test(consignmentId)) {
      return errorResponse('BAD_REQUEST', 'Missing or invalid consignment identification', 400);
    }

    // 1. Find linked shipment first to retrieve tenant context
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

    // 2. Strict Webhook Authentication Check (Mandatory)
    const configuredSecret = process.env.COURIER_WEBHOOK_SECRET;
    const incomingSignature =
      req.headers.get('x-steadfast-signature') ||
      req.headers.get('x-pathao-signature') ||
      req.headers.get('x-webhook-secret') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      new URL(req.url).searchParams.get('secret') ||
      '';

    let isAuthorized = false;

    // Check against global webhook secret if configured
    if (configuredSecret) {
      const expectedHmac = crypto.createHmac('sha256', configuredSecret).update(rawBody).digest('hex');
      const isDirectSecretValid = timingSafeCompare(incomingSignature, configuredSecret);
      const isHmacValid = timingSafeCompare(incomingSignature, expectedHmac);
      if (isDirectSecretValid || isHmacValid) {
        isAuthorized = true;
      }
    }

    // Also check against tenant's configured courier credentials secret if not authorized yet
    if (!isAuthorized) {
      const { data: creds } = await supabaseAdmin
        .from('courier_credentials')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (creds?.encrypted_api_secret) {
        try {
          const tenantSecret = decrypt(creds.encrypted_api_secret);
          const tenantHmac = crypto.createHmac('sha256', tenantSecret).update(rawBody).digest('hex');
          if (timingSafeCompare(incomingSignature, tenantSecret) || timingSafeCompare(incomingSignature, tenantHmac)) {
            isAuthorized = true;
          }
        } catch {
          // Decryption failed or secret invalid
        }
      }
    }

    // If still not authorized, reject with 401 Unauthorized
    if (!isAuthorized) {
      return errorResponse('UNAUTHORIZED', 'Invalid or missing webhook signature/secret', 401);
    }

    // 3. Map courier status to sanitized order status
    const statusText = (courierStatus || '').toLowerCase();
    let mappedStatus: string = order.status;
    let sanitizedShipmentStatus = 'in_transit';
    let isDelivered = false;
    let isReturned = false;

    if (statusText.includes('deliver') || statusText === 'successful') {
      mappedStatus = 'delivered';
      sanitizedShipmentStatus = 'delivered';
      isDelivered = true;
    } else if (statusText.includes('return') || statusText.includes('cancel') || statusText === 'rto') {
      mappedStatus = 'returned';
      sanitizedShipmentStatus = 'returned';
      isReturned = true;
    } else if (statusText.includes('transit') || statusText.includes('shipped') || statusText.includes('picked')) {
      mappedStatus = 'shipped';
      sanitizedShipmentStatus = 'in_transit';
    }

    if (!ALLOWED_SHIPMENT_STATUSES.includes(sanitizedShipmentStatus)) {
      sanitizedShipmentStatus = 'in_transit';
    }

    // 4. Update shipment record with sanitized status
    await supabaseAdmin
      .from('courier_shipments')
      .update({
        status: sanitizedShipmentStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', shipment.id);

    // 5. Update order status if changed
    if (order.status !== mappedStatus) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: mappedStatus as unknown as 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    // 6. If RETURNED/RTO and not previously recorded as returned:
    // a) Restore stock idempotently (check if movements already recorded for this order return)
    // b) Log return cost idempotently (check if bill_cost already recorded)
    if (isReturned && order.status !== 'returned') {
      // Check existing stock return movements for this order
      const { data: existingMovements } = await supabaseAdmin
        .from('stock_movements')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('reason', 'order_return')
        .eq('reference_id', order.id);

      if (!existingMovements || existingMovements.length === 0) {
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
      }

      // Check existing return cost bill
      const returnBillName = `Return Cost - Order #${order.id.slice(0, 8)}`;
      const { data: existingReturnBill } = await supabaseAdmin
        .from('bill_costs')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('category', 'return_cost')
        .eq('name', returnBillName)
        .maybeSingle();

      if (!existingReturnBill) {
        const returnCostAmount = Math.max(0, Number(order.delivery_charge) || 120);

        await supabaseAdmin.from('bill_costs').insert({
          tenant_id: tenantId,
          name: returnBillName,
          amount: returnCostAmount,
          date: new Date().toISOString().slice(0, 10),
          category: 'return_cost',
          is_recurring: false,
        });
      }
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
    return errorResponse('INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
}
