import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function validateSslCommerzTransaction(valId: string, tranId: string, expectedAmount: number) {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
  const isProd = process.env.NODE_ENV === 'production';

  // If mock mode in local development only
  if (!storeId || !storePass) {
    if (!isProd && process.env.NODE_ENV === 'development' && valId.startsWith('mock_valid_')) {
      return { isValid: true, reason: 'Mock validation accepted in local development' };
    }
    return { isValid: false, reason: 'SSLCommerz credentials not configured on server' };
  }

  try {
    const host = isSandbox ? 'sandbox.sslcommerz.com' : 'securepay.sslcommerz.com';
    const validateUrl = `https://${host}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePass)}&v=1&format=json`;

    const res = await fetch(validateUrl, { method: 'GET' });
    if (!res.ok) {
      return { isValid: false, reason: `SSLCommerz API returned HTTP status ${res.status}` };
    }

    const data = await res.json();
    const isValidStatus = data.status === 'VALID' || data.status === 'VALIDATED';
    const isMatchingTran = data.tran_id === tranId;
    const isMatchingAmount = Math.abs(Number(data.amount) - expectedAmount) < 1;

    if (!isValidStatus || !isMatchingTran || !isMatchingAmount) {
      return {
        isValid: false,
        reason: `Validation mismatch: status=${data.status}, tran_id_match=${isMatchingTran}, amount_match=${isMatchingAmount}`,
      };
    }

    return { isValid: true, data };
  } catch (err) {
    return { isValid: false, reason: err instanceof Error ? err.message : 'Validation request failed' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const body: Record<string, string> = {};

    if (formData) {
      formData.forEach((val, key) => {
        body[key] = String(val);
      });
    } else {
      const json = await req.json().catch(() => ({}));
      Object.assign(body, json);
    }

    const tranId = body.tran_id;
    const status = body.status;
    const valId = body.val_id;

    if (!tranId) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
    }

    // 1. Fetch pending subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('sslcommerz_transaction_id', tranId)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found for transaction' }, { status: 404 });
    }

    // Check idempotency - if already active, do not re-process
    if (subscription.status === 'active') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${appUrl}/settings?payment=success`, { status: 302 });
    }

    let isSuccess = false;

    // 2. Perform strict server-to-server validation if val_id is provided
    if ((status === 'VALID' || status === 'VALIDATED') && valId) {
      const validation = await validateSslCommerzTransaction(valId, tranId, Number(subscription.amount));
      isSuccess = validation.isValid;
      if (!isSuccess) {
        console.warn('SSLCommerz server validation failed:', validation.reason);
      }
    }

    if (isSuccess) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days active

      // 3. Mark subscription active
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          renewed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', subscription.id);

      // 4. Update tenant plan
      await supabaseAdmin
        .from('tenants')
        .update({
          plan: subscription.plan as 'basic' | 'pro',
          subscription_status: 'active',
        })
        .eq('id', subscription.tenant_id);
    } else {
      // Mark failed/cancelled
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);
    }

    // Redirect merchant back to billing settings page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/settings?payment=${isSuccess ? 'success' : 'failed'}`, {
      status: 302,
    });
  } catch (err) {
    console.error('Billing webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * GET callback is strictly a safe read-and-redirect callback.
 * Zero state mutations happen in GET requests to prevent CSRF / crawler replay side-effects.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tranId = searchParams.get('tran_id');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!tranId) {
    return NextResponse.redirect(`${appUrl}/settings?payment=failed`, { status: 302 });
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('sslcommerz_transaction_id', tranId)
    .single();

  if (!subscription) {
    return NextResponse.redirect(`${appUrl}/settings?payment=failed`, { status: 302 });
  }

  if (subscription.status === 'active') {
    return NextResponse.redirect(`${appUrl}/settings?payment=success`, { status: 302 });
  }

  return NextResponse.redirect(`${appUrl}/settings?payment=pending`, { status: 302 });
}
