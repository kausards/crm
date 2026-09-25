export interface PathaoCredentials {
  apiKey: string; // Used as Bearer token or client credentials
  secretKey?: string | null;
}

export interface PathaoConsignmentPayload {
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  amount_to_collect: number;
  item_description?: string;
}

const BASE_URL = 'https://api-hermes.pathao.com/aladdin/api/v1';

export async function createPathaoConsignment(
  creds: PathaoCredentials,
  payload: PathaoConsignmentPayload
): Promise<{ consignment_id: string; tracking_code: string; status: string }> {
  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pathao order creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const consignmentId = data.data?.consignment_id || data.consignment_id || 'pathao_' + Date.now();

  return {
    consignment_id: consignmentId,
    tracking_code: consignmentId,
    status: 'created',
  };
}

export async function getPathaoStatus(
  creds: PathaoCredentials,
  consignmentId: string
): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/orders/${consignmentId}/info`, {
    headers: {
      'Authorization': `Bearer ${creds.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Pathao status check failed: ${response.status}`);
  }

  const data = await response.json();
  return { status: data.data?.order_status || 'unknown' };
}
