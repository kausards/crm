import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, business_name, plan, subscription_status, created_at')
      .eq('id', auth.tenantId)
      .single();

    return successResponse({
      user: {
        id: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        role: auth.role,
      },
      tenant: tenant || {
        id: auth.tenantId,
        business_name: 'My Business',
        plan: 'trial',
        subscription_status: 'active',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
