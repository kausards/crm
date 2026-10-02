import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const [{ data: tenant }, { data: profileRow }] = await Promise.all([
      supabase
        .from('tenants')
        .select('id, business_name, plan, subscription_status, created_at')
        .eq('id', auth.tenantId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, tenant_id, role, full_name, email')
        .eq('id', auth.userId)
        .maybeSingle(),
    ]);

    const superAdminId = process.env.SUPER_ADMIN_USER_ID;
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'kausar.test@crmdemo.com').toLowerCase();
    const userEmail = (auth.email || '').toLowerCase();
    const isSuper = Boolean(
      (superAdminId && auth.userId === superAdminId) ||
      (userEmail && userEmail === superAdminEmail)
    );

    const effectiveName = profileRow?.full_name || auth.fullName || 'Merchant';

    return successResponse({
      user: {
        id: auth.userId,
        email: auth.email,
        fullName: effectiveName,
        role: auth.role,
        tenantId: auth.tenantId,
        isSuperAdmin: isSuper,
      },
      profile: {
        id: auth.userId,
        tenant_id: auth.tenantId,
        role: auth.role,
        full_name: effectiveName,
        email: auth.email,
      },
      tenant: tenant || {
        id: auth.tenantId,
        business_name: 'NexusFlow Store',
        plan: 'pro',
        subscription_status: 'active',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
