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

    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, direction, quantity, reason, reference_id, created_at')
      .eq('product_id', id)
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse({ movements: data || [] });
  } catch (err) {
    return handleApiError(err);
  }
}
