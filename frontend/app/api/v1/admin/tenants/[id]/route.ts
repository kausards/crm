import { NextRequest } from 'next/server';
import { requireSuperAdmin } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updateTenantPlanSchema } from '@/lib/validators/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tenant) {
      return errorResponse('NOT_FOUND', 'Tenant not found', 404);
    }

    // Fetch owner and profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, created_at')
      .eq('tenant_id', id);

    // Fetch counts
    const { count: ordersCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    const { count: productsCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    const { count: employeesCount } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    return successResponse({
      tenant,
      profiles: profiles || [],
      stats: {
        total_orders: ordersCount || 0,
        total_products: productsCount || 0,
        total_employees: employeesCount || 0,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const validated = updateTenantPlanSchema.parse(body);

    if (Object.keys(validated).length === 0) {
      return errorResponse('BAD_REQUEST', 'No update fields provided', 400);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tenants')
      .update(validated)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updated) {
      return errorResponse('NOT_FOUND', 'Tenant not found or update failed', 404);
    }

    return successResponse({
      message: 'Tenant updated successfully',
      tenant: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
