export interface SteadfastCredentials {
  apiKey: string;
  secretKey?: string | null;
}

export interface SteadfastConsignmentPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string | null;
}

export interface SteadfastConsignmentResponse {
  consignment_id: string;
  tracking_code: string;
  status: string;
}

export interface SteadfastFraudCheckResponse {
  phone: string;
  total_parcels: number;
  total_delivered: number;
  total_returned: number;
  total_cancelled?: number;
  delivery_rate_percent: number;
  cancel_rate_percent: number;
  return_rate_percent: number;
  fraud_reports: number;
  fraud_comment?: string | null;
  is_flagged: boolean;
  reason?: string;
}

const BASE_URL = 'https://portal.steadfast.com.bd/api/v1';

export async function createSteadfastConsignment(
  creds: SteadfastCredentials,
  payload: SteadfastConsignmentPayload
): Promise<SteadfastConsignmentResponse> {
  const response = await fetch(`${BASE_URL}/create_order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': creds.apiKey,
      'Secret-Key': creds.secretKey || '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Steadfast consignment creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const order = data.consignment || data.order || data;

  return {
    consignment_id: String(order.consignment_id || order.id || payload.invoice),
    tracking_code: String(order.tracking_code || order.consignment_id || ''),
    status: order.status || 'in_review',
  };
}

export async function getSteadfastStatus(
  creds: SteadfastCredentials,
  consignmentId: string
): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/status_by_cid/${consignmentId}`, {
    method: 'GET',
    headers: {
      'Api-Key': creds.apiKey,
      'Secret-Key': creds.secretKey || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Steadfast status query failed with status ${response.status}`);
  }

  const data = await response.json();
  return { status: data.delivery_status || data.status || 'unknown' };
}

/**
 * Return risk / COD fraud check against courier delivery history
 * Evaluates against configurable delivery and cancellation ratio thresholds.
 */
export async function checkSteadfastCustomerRisk(
  creds: SteadfastCredentials,
  phone: string,
  thresholds?: { minDeliveryRatio?: number; maxCancelRatio?: number }
): Promise<SteadfastFraudCheckResponse> {
  const minDelivery = thresholds?.minDeliveryRatio ?? 50;
  const maxCancel = thresholds?.maxCancelRatio ?? 50;

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const response = await fetch(`${BASE_URL}/fraud_check/${cleanPhone}`, {
      method: 'GET',
      headers: {
        'Api-Key': creds.apiKey,
        'Secret-Key': creds.secretKey || '',
      },
    });

    if (!response.ok) {
      return {
        phone,
        total_parcels: 0,
        total_delivered: 0,
        total_returned: 0,
        delivery_rate_percent: 0,
        cancel_rate_percent: 0,
        return_rate_percent: 0,
        fraud_reports: 0,
        is_flagged: false,
      };
    }

    const data = await response.json();
    const total = Number(data.total_parcels || data.total_orders || 0);
    const delivered = Number(data.total_delivered || data.delivered || 0);
    const returned = Number(data.total_returned || data.cancelled || data.total_cancelled || 0);
    const fraudReports = Number(data.total_fraud_reports || data.fraud_reports || data.reports_count || 0);
    const fraudComment = Array.isArray(data.comments)
      ? data.comments.join(', ')
      : typeof data.comments === 'string'
      ? data.comments
      : data.comment || data.fraud_comment || null;

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0;
    const cancelRate = total > 0 ? Math.round((returned / total) * 1000) / 10 : 0;

    let isFlagged = false;
    let reason: string | undefined;

    if (fraudReports > 0 || fraudComment) {
      isFlagged = true;
      reason = fraudComment
        ? `Steadfast Fraud Comment: "${fraudComment}"`
        : `Steadfast Flagged: ${fraudReports} fraud report(s) on file`;
    } else if (total > 0 && deliveryRate < minDelivery) {
      isFlagged = true;
      reason = `Low Delivery Ratio: ${deliveryRate}% (Below ${minDelivery}% minimum threshold)`;
    } else if (total > 0 && cancelRate > maxCancel) {
      isFlagged = true;
      reason = `High Cancel Ratio: ${cancelRate}% (Above ${maxCancel}% cancellation threshold)`;
    }

    return {
      phone,
      total_parcels: total,
      total_delivered: delivered,
      total_returned: returned,
      total_cancelled: returned,
      delivery_rate_percent: deliveryRate,
      cancel_rate_percent: cancelRate,
      return_rate_percent: cancelRate,
      fraud_reports: fraudReports,
      fraud_comment: fraudComment,
      is_flagged: isFlagged,
      reason,
    };
  } catch {
    return {
      phone,
      total_parcels: 0,
      total_delivered: 0,
      total_returned: 0,
      delivery_rate_percent: 0,
      cancel_rate_percent: 0,
      return_rate_percent: 0,
      fraud_reports: 0,
      is_flagged: false,
    };
  }
}
