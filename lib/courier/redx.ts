export interface RedXCredentials {
  apiKey: string;
}

export interface RedXConsignmentPayload {
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  customer_address: string;
  cash_collection_amount: number;
}

const BASE_URL = 'https://openapi.redx.com.bd/v1.0.0-beta';

export async function createRedXConsignment(
  creds: RedXCredentials,
  payload: RedXConsignmentPayload
): Promise<{ consignment_id: string; tracking_code: string; status: string }> {
  const response = await fetch(`${BASE_URL}/parcels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-ACCESS-TOKEN': `Bearer ${creds.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RedX parcel creation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const trackingId = String(data.tracking_id || data.parcel_id || 'redx_' + Date.now());

  return {
    consignment_id: trackingId,
    tracking_code: trackingId,
    status: 'created',
  };
}

export async function getRedXStatus(
  creds: RedXCredentials,
  trackingId: string
): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/parcels/info/${trackingId}`, {
    headers: {
      'API-ACCESS-TOKEN': `Bearer ${creds.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`RedX status query failed: ${response.status}`);
  }

  const data = await response.json();
  return { status: data.parcel?.status || 'unknown' };
}
