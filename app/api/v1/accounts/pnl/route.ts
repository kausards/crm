import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { calculateOverallPnL } from '@/lib/accounting/pnl';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const today = new Date().toISOString().slice(0, 10);
    const startOfMonth = today.slice(0, 8) + '01';

    const from = searchParams.get('from') || startOfMonth;
    const to = searchParams.get('to') || today;

    const pnl = await calculateOverallPnL(supabase, auth.tenantId, from, to);

    return successResponse(pnl);
  } catch (err) {
    return handleApiError(err);
  }
}
