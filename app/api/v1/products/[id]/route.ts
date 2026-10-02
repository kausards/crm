import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { updateProductSchema, stockAdjustSchema } from '@/lib/validators/product';
import { createClient } from '@/lib/supabase/server';
import { logStockMovement } from '@/lib/accounting/stockMovement';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !product) {
      return errorResponse('NOT_FOUND', 'Product not found', 404);
    }

    return successResponse(product);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const body = await req.json();

    const supabase = await createClient();

    // Check if body is a manual stock adjustment
    if (body.direction && body.quantity) {
      const adjust = stockAdjustSchema.parse(body);
      const newStock = await logStockMovement({
        supabase,
        tenantId: auth.tenantId,
        productId: id,
        direction: adjust.direction,
        quantity: adjust.quantity,
        reason: adjust.reason,
      });

      return successResponse({
        id,
        stock_quantity: newStock,
        adjusted: true,
      });
    }

    const validated = updateProductSchema.parse(body);

    const { data: updated, error } = await supabase
      .from('products')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      return errorResponse('NOT_FOUND', 'Product not found or update failed', 404);
    }

    return successResponse(updated);
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

    // Soft delete: is_active = false
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('NOT_FOUND', 'Product not found', 404);
    }

    return successResponse({ message: 'Product archived successfully' });
  } catch (err) {
    return handleApiError(err);
  }
}
