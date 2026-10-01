import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();

    const plan = body.plan === 'pro' ? 'pro' : 'basic';
    const amount = plan === 'pro' ? 2499 : 999;
    const tranId = `SUB_${auth.tenantId.slice(0, 8)}_${Date.now()}`;

    // Record pending subscription in database
    await supabaseAdmin.from('subscriptions').insert({
      tenant_id: auth.tenantId,
      plan,
      status: 'pending',
      amount,
      sslcommerz_transaction_id: tranId,
    });

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!storeId || !storePass) {
      // In sandbox/dev without real keys, return mock payment URL or simulated success
      return successResponse({
        mode: 'mock',
        paymentUrl: `${appUrl}/api/v1/billing/webhook?val_id=mock_valid_${tranId}&tran_id=${tranId}&status=VALID`,
        transactionId: tranId,
        amount,
        plan,
      });
    }

    const sslczUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const formData = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePass,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${appUrl}/api/v1/billing/webhook`,
      fail_url: `${appUrl}/api/v1/billing/webhook`,
      cancel_url: `${appUrl}/api/v1/billing/webhook`,
      ipn_url: `${appUrl}/api/v1/billing/webhook`,
      cus_name: auth.fullName || 'Merchant',
      cus_email: auth.email || 'merchant@example.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      product_name: `Inventory SaaS ${plan.toUpperCase()} Plan`,
      product_category: 'Software',
      product_profile: 'non-physical-goods',
    });

    const gatewayRes = await fetch(sslczUrl, {
      method: 'POST',
      body: formData,
    });

    const gatewayData = await gatewayRes.json();

    if (gatewayData.status !== 'SUCCESS') {
      return errorResponse('BAD_REQUEST', gatewayData.failedreason || 'Failed to initiate payment', 400);
    }

    return successResponse({
      paymentUrl: gatewayData.GatewayPageURL,
      transactionId: tranId,
      plan,
      amount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
