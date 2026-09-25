import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { updateBillCostSchema } from '@/lib/validators/billCost';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const body = await req.json();
    const validated = updateBillCostSchema.parse(body);

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('bill_costs')
      .update(validated)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      return errorResponse('NOT_FOUND', 'Bill cost entry not found', 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('bill_costs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('NOT_FOUND', 'Bill cost entry not found', 404);
    }

    return successResponse({ message: 'Bill cost deleted successfully' });
  } catch (err) {
    return handleApiError(err);
  }
}
