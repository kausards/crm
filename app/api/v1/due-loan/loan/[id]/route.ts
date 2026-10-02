import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
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
    const supabase = await createClient();

    const updateData: Record<string, any> = {};
    if (body.party_name !== undefined) updateData.party_name = body.party_name;
    if (body.party_phone !== undefined) updateData.party_phone = body.party_phone || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.note !== undefined) updateData.note = body.note || null;
    if (body.date !== undefined) updateData.date = body.date;

    const { data, error } = await supabase
      .from('loan_ledger')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !data) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to update loan entry', 500);
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = PATCH;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('loan_ledger')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse({ deleted: true, id });
  } catch (err) {
    return handleApiError(err);
  }
}
