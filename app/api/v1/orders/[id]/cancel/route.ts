import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { logStockMovement } from '@/lib/accounting/stockMovement';
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

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (orderErr || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    if (order.status === 'cancelled') {
      return errorResponse('BAD_REQUEST', 'Order is already cancelled', 400);
    }

    // 2. If order was confirmed, packed, or shipped, stock was deducted -> restore it
    const stockWasDeducted = ['confirmed', 'packed', 'shipped'].includes(order.status);

    if (stockWasDeducted) {
      for (const item of order.order_items || []) {
        await logStockMovement({
          supabase,
          tenantId: auth.tenantId,
          productId: item.product_id,
          direction: 'in',
          quantity: item.quantity,
          reason: 'order_cancel',
          referenceId: order.id,
        });
      }
    }

    // 3. Update order status
    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        notes: body.reason ? `Cancelled: ${body.reason}` : order.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (updateErr) {
      return errorResponse('INTERNAL_ERROR', 'Failed to cancel order', 500);
    }

    return successResponse({
      order: updated,
      stockRestored: stockWasDeducted,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
