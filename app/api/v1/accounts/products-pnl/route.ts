import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { calculateProductPnL } from '@/lib/accounting/pnl';
import { successResponse, handleApiError } from '@/lib/apiResponse';

/**
 * GET /api/v1/accounts/products-pnl
 * Returns per-product P&L as JSON for the SKU breakdown table in the Accounts page.
 * Owner only.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const results = await Promise.all(
      (products || []).map((p) =>
        calculateProductPnL(supabase, auth.tenantId, p.id).catch(() => null)
      )
    );

    const validResults = results.filter(Boolean);

    return successResponse(validResults);
  } catch (err) {
    return handleApiError(err);
  }
}
