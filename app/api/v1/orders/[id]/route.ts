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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const allowedFields = [
      'customer_name',
      'customer_phone',
      'customer_address',
      'delivery_charge',
      'total_amount',
      'cod_amount',
      'notes',
      'courier_provider',
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('BAD_REQUEST', 'No valid fields to update', 400);
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*, order_items(*, products(*)), courier_shipments(*)')
      .single();

    if (error || !updated) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to update order', 500);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = PATCH;

