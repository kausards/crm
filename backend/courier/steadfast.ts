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
  return_rate_percent: number;
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
 * Display-only flag, never auto-blocks.
 */
export async function checkSteadfastCustomerRisk(
  creds: SteadfastCredentials,
  phone: string
): Promise<SteadfastFraudCheckResponse> {
  try {
    const response = await fetch(`${BASE_URL}/fraud_check/${phone}`, {
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
        return_rate_percent: 0,
        is_flagged: false,
      };
    }

    const data = await response.json();
    const total = Number(data.total_parcels || data.total_orders || 0);
    const returned = Number(data.total_returned || data.cancelled || 0);
    const delivered = Number(data.total_delivered || data.delivered || 0);

    const returnRate = total > 0 ? (returned / total) * 100 : 0;
    const isFlagged = returnRate >= 40 && total >= 3;

    return {
      phone,
      total_parcels: total,
      total_delivered: delivered,
      total_returned: returned,
      return_rate_percent: Math.round(returnRate * 10) / 10,
      is_flagged: isFlagged,
      reason: isFlagged ? `High return rate: ${Math.round(returnRate)}% (${returned}/${total} orders returned)` : undefined,
    };
  } catch {
    // If external courier check fails or timeout occurs, gracefully return unflagged
    return {
      phone,
      total_parcels: 0,
      total_delivered: 0,
      total_returned: 0,
      return_rate_percent: 0,
      is_flagged: false,
    };
  }
}
