import { requireSuperAdmin } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    await requireSuperAdmin();

    // 1. Fetch total tenants count and breakdown
    const { data: allTenants, error: tenantsErr } = await supabaseAdmin
      .from('tenants')
      .select('id, business_name, plan, subscription_status, created_at, owner_id')
      .order('created_at', { ascending: false });

    if (tenantsErr) throw tenantsErr;

    const tenants = allTenants || [];
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.subscription_status === 'active').length;
    const proTenants = tenants.filter((t) => t.plan === 'pro').length;
    const basicTenants = tenants.filter((t) => t.plan === 'basic').length;
    const trialTenants = tenants.filter((t) => t.plan === 'trial').length;

    // 2. Fetch counts for system-wide entities
    const [{ count: totalOrders }, { count: totalProducts }, { count: totalCustomers }] =
      await Promise.all([
        supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }),
      ]);

    // 3. Approximate GMV across all orders (excluding cancelled)
    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status')
      .neq('status', 'cancelled')
      .limit(1000);

    const totalGmv = (ordersData || []).reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    // 4. Enrich recent 5 tenants with owner profile info
    const recentTenants = tenants.slice(0, 5);
    const recentTenantIds = recentTenants.map((t) => t.id);

    let profilesMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (recentTenantIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id, email, full_name, role')
        .in('tenant_id', recentTenantIds)
        .eq('role', 'owner');

      profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.tenant_id] = { email: p.email, full_name: p.full_name };
        return acc;
      }, {} as Record<string, { email: string | null; full_name: string | null }>);
    }

    const enrichedRecent = recentTenants.map((t) => ({
      ...t,
      owner: profilesMap[t.id] || null,
    }));

    return successResponse({
      stats: {
        totalTenants,
        activeTenants,
        proTenants,
        basicTenants,
        trialTenants,
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalCustomers: totalCustomers || 0,
        totalGmv,
        estimatedMrr: proTenants * 3500 + basicTenants * 1500, // standard BD BDT SaaS pricing projection
      },
      recentTenants: enrichedRecent,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
