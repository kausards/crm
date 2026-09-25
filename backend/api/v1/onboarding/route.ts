import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { openingBalanceSchema, onboardingProfileSchema } from '@/lib/validators/onboarding';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();

    const profileData = onboardingProfileSchema.safeParse(body);
    const balanceData = openingBalanceSchema.safeParse(body);

    const supabase = await createClient();

    // 1. Update business name if provided
    if (profileData.success) {
      await supabase
        .from('tenants')
        .update({ business_name: profileData.data.business_name })
        .eq('id', auth.tenantId);
    }

    // 2. Set opening balances
    if (balanceData.success) {
      const { total_stock_value, total_receivable, total_payable } = balanceData.data;

      await supabase.from('opening_balances').upsert({
        tenant_id: auth.tenantId,
        total_stock_value,
        total_receivable,
        total_payable,
        set_at: new Date().toISOString(),
      });
    }

    return successResponse({
      message: 'Onboarding completed successfully',
      tenantId: auth.tenantId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
