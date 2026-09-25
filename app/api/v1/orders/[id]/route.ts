import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*)), courier_shipments(*)')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    return successResponse(order);
  } catch (err) {
    return handleApiError(err);
  }
}
