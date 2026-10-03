import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { checkSteadfastCustomerRisk } from '@/lib/courier/steadfast';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return errorResponse('BAD_REQUEST', 'Phone parameter is required', 400);
    }

    const supabase = await createClient();

    // 1. Fetch tenant risk thresholds
    const { data: tenant } = await supabase
      .from('tenants')
      .select('min_delivery_ratio, max_cancel_ratio')
      .eq('id', auth.tenantId)
      .single();

    const minDelivery = Number(tenant?.min_delivery_ratio ?? 50);
    const maxCancel = Number(tenant?.max_cancel_ratio ?? 50);

    // 2. Fetch Steadfast credentials
    const { data: courierCreds } = await supabase
      .from('courier_credentials')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('provider', 'steadfast')
      .eq('is_active', true)
      .maybeSingle();

    if (courierCreds) {
      const apiKey = decrypt(courierCreds.encrypted_api_key);
      const secretKey = courierCreds.encrypted_api_secret ? decrypt(courierCreds.encrypted_api_secret) : null;

      const risk = await checkSteadfastCustomerRisk(
        { apiKey, secretKey },
        phone,
        { minDeliveryRatio: minDelivery, maxCancelRatio: maxCancel }
      );

      return successResponse(risk);
    }

    // If no credentials configured yet, check if there's existing internal CRM delivery history for this customer phone
    const { data: internalOrders } = await supabase
      .from('orders')
      .select('status')
      .eq('tenant_id', auth.tenantId)
      .eq('customer_phone', phone);

    const total = internalOrders?.length || 0;
    const delivered = internalOrders?.filter(o => o.status === 'delivered').length || 0;
    const cancelled = internalOrders?.filter(o => o.status === 'cancelled' || o.status === 'returned').length || 0;

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0;
    const cancelRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

    let isFlagged = false;
    let reason: string | undefined;

    if (total >= 2) {
      if (deliveryRate < minDelivery) {
        isFlagged = true;
        reason = `Low Delivery Ratio: ${deliveryRate}% (Below ${minDelivery}% minimum)`;
      } else if (cancelRate > maxCancel) {
        isFlagged = true;
        reason = `High Cancel Ratio: ${cancelRate}% (Above ${maxCancel}% limit)`;
      }
    }

    return successResponse({
      phone,
      total_parcels: total,
      total_delivered: delivered,
      total_returned: cancelled,
      total_cancelled: cancelled,
      delivery_rate_percent: deliveryRate,
      cancel_rate_percent: cancelRate,
      return_rate_percent: cancelRate,
      fraud_reports: 0,
      fraud_comment: null,
      is_flagged: isFlagged,
      reason,
      source: 'internal_crm_history',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
