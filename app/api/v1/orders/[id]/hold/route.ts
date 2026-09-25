import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('orders')
      .update({
        status: 'on_hold',
        notes: body.reason ? `Hold Reason: ${body.reason}` : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
