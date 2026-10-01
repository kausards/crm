import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;

    // Prevent owner from deleting themselves
    if (id === auth.userId) {
      return errorResponse('BAD_REQUEST', 'Cannot delete your own owner account', 400);
    }

    // Verify target profile belongs to current tenant and is not owner
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, role, full_name, email')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (profileErr || !targetProfile) {
      return errorResponse('NOT_FOUND', 'Staff member not found', 404);
    }

    if (targetProfile.role === 'owner') {
      return errorResponse('FORBIDDEN', 'Cannot remove an owner account', 403);
    }

    // Delete profile record
    const { error: deleteProfileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (deleteProfileErr) {
      return errorResponse('INTERNAL_ERROR', `Failed to delete profile: ${deleteProfileErr.message}`, 500);
    }

    // Delete auth user from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
    } catch (authDeleteErr) {
      console.warn('Warning: Failed to delete user from auth service:', authDeleteErr);
    }

    return successResponse({
      message: 'Staff member removed successfully',
      removed: {
        id: targetProfile.id,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
