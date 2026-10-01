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

    const superAdminId = process.env.SUPER_ADMIN_USER_ID;
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'kausar.test@crmdemo.com').toLowerCase();
    const userEmail = (auth.email || '').toLowerCase();
    const isSuper = Boolean(
      (superAdminId && auth.userId === superAdminId) ||
      (userEmail && userEmail === superAdminEmail)
    );

    return successResponse({
      user: {
        id: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        role: auth.role,
        tenantId: auth.tenantId,
        isSuperAdmin: isSuper,
      },
      profile: {
        id: auth.userId,
        tenant_id: auth.tenantId,
        role: auth.role,
        full_name: auth.fullName,
        email: auth.email,
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
