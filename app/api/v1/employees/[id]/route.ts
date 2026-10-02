import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const updateData: Record<string, any> = {
      name: body.name,
      phone: body.phone || null,
      monthly_salary: Number(body.monthly_salary) || 0,
      salary_divisor: Number(body.salary_divisor) || 30,
    };

    if (body.is_active !== undefined) {
      updateData.is_active = Boolean(body.is_active);
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !data) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to update employee', 500);
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export const PATCH = PUT;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const supabase = await createClient();

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('employees')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse({ deactivated: true, id });
  } catch (err) {
    return handleApiError(err);
  }
}
