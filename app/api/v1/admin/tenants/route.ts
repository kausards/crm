import { NextRequest } from 'next/server';
import { requireSuperAdmin } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { paginatedResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const plan = searchParams.get('plan')?.trim();
    const status = searchParams.get('status')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('tenants')
      .select('id, business_name, owner_id, plan, subscription_status, created_at', { count: 'exact' });

    if (search) {
      query = query.ilike('business_name', `%${search}%`);
    }

    if (plan && ['trial', 'basic', 'pro'].includes(plan)) {
      query = query.eq('plan', plan);
    }

    if (status && ['active', 'expired', 'cancelled'].includes(status)) {
      query = query.eq('subscription_status', status);
    }

    const { data: tenants, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const tenantList = tenants || [];
    const tenantIds = tenantList.map((t) => t.id);

    // Fetch profiles for these tenants to enrich with owner and staff count
    let profilesByTenant: Record<string, { owner?: { id: string; email: string | null; full_name: string | null }; staffCount: number }> = {};
    if (tenantIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, tenant_id, role, email, full_name')
        .in('tenant_id', tenantIds);

      profilesByTenant = (profiles || []).reduce((acc, p) => {
        if (!acc[p.tenant_id]) {
          acc[p.tenant_id] = { staffCount: 0 };
        }
        if (p.role === 'owner') {
          acc[p.tenant_id].owner = {
            id: p.id,
            email: p.email,
            full_name: p.full_name,
          };
        } else {
          acc[p.tenant_id].staffCount++;
        }
        return acc;
      }, {} as Record<string, { owner?: { id: string; email: string | null; full_name: string | null }; staffCount: number }>);
    }

    const enrichedTenants = tenantList.map((t) => {
      const pInfo = profilesByTenant[t.id];
      return {
        ...t,
        owner: pInfo?.owner || null,
        staff_count: pInfo?.staffCount || 0,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    return paginatedResponse(enrichedTenants, { total, page, limit, totalPages });
  } catch (err) {
    return handleApiError(err);
  }
}
