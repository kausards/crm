import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { calculateProductPnL } from '@/lib/accounting/pnl';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const pnl = await calculateProductPnL(supabase, auth.tenantId, id);

    return successResponse(pnl);
  } catch (err) {
    return handleApiError(err);
  }
}
