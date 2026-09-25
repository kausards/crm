import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    const isSuccess = status === 'VALID' || status === 'VALIDATED';

    if (isSuccess) {
      // 1. Fetch subscription
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('sslcommerz_transaction_id', tranId)
        .single();

      if (subscription) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days active

        // 2. Mark subscription active
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            renewed_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', subscription.id);

        // 3. Update tenant plan
        await supabaseAdmin
          .from('tenants')
          .update({
            plan: subscription.plan as 'basic' | 'pro',
            subscription_status: 'active',
          })
          .eq('id', subscription.tenant_id);
      }
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

export async function GET(req: NextRequest) {
  // Support GET redirect callbacks from mock or sandbox
  const { searchParams } = new URL(req.url);
  const tranId = searchParams.get('tran_id');
  const status = searchParams.get('status');

  if (tranId && (status === 'VALID' || status === 'VALIDATED')) {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('sslcommerz_transaction_id', tranId)
      .single();

    if (subscription) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          renewed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', subscription.id);

      await supabaseAdmin
        .from('tenants')
        .update({
          plan: subscription.plan as 'basic' | 'pro',
          subscription_status: 'active',
        })
        .eq('id', subscription.tenant_id);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/settings?payment=success`, { status: 302 });
}
