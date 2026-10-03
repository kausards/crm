import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('min_delivery_ratio, max_cancel_ratio')
      .eq('id', auth.tenantId)
      .single();

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse({
      minDeliveryRatio: Number(tenant?.min_delivery_ratio ?? 50),
      maxCancelRatio: Number(tenant?.max_cancel_ratio ?? 50),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const supabase = await createClient();

    const minDelivery = Number(body.minDeliveryRatio ?? 50);
    const maxCancel = Number(body.maxCancelRatio ?? 50);

    if (isNaN(minDelivery) || minDelivery < 0 || minDelivery > 100) {
      return errorResponse('BAD_REQUEST', 'Delivery ratio must be between 0 and 100%', 400);
    }
    if (isNaN(maxCancel) || maxCancel < 0 || maxCancel > 100) {
      return errorResponse('BAD_REQUEST', 'Cancel ratio must be between 0 and 100%', 400);
    }

    const { data: updated, error } = await supabase
      .from('tenants')
      .update({
        min_delivery_ratio: minDelivery,
        max_cancel_ratio: maxCancel,
      })
      .eq('id', auth.tenantId)
      .select('min_delivery_ratio, max_cancel_ratio')
      .single();

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse({
      minDeliveryRatio: Number(updated?.min_delivery_ratio ?? 50),
      maxCancelRatio: Number(updated?.max_cancel_ratio ?? 50),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
