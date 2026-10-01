import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { updateCodCollectedSchema } from '@/lib/validators/order';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const validated = updateCodCollectedSchema.parse(body);

    const supabase = await createClient();

    // Verify order exists for tenant
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, cod_amount, cod_collected')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (orderErr || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({
        cod_collected: validated.cod_collected,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return errorResponse('INTERNAL_ERROR', 'Failed to update collected COD amount', 500);
    }

    const codExpected = Number(order.cod_amount) || 0;
    const codCollected = Number(validated.cod_collected) || 0;
    const difference = Math.round((codExpected - codCollected) * 100) / 100;

    return successResponse({
      order: updated,
      reconciliation: {
        cod_expected: codExpected,
        cod_collected: codCollected,
        discrepancy: difference,
        is_fully_collected: difference === 0,
        status: difference === 0 ? 'full' : difference > 0 ? 'shortfall' : 'excess',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
