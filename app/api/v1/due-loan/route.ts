import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    // 1. Fetch due ledger entries
    const { data: dues } = await supabase
      .from('due_ledger')
      .select('type, amount')
      .eq('tenant_id', auth.tenantId);

    let totalCustomerReceivable = 0;
    for (const d of dues || []) {
      const amt = Number(d.amount) || 0;
      if (d.type === 'credit') totalCustomerReceivable += amt;
      else totalCustomerReceivable -= amt;
    }

    // 2. Fetch loan ledger entries
    const { data: loans } = await supabase
      .from('loan_ledger')
      .select('type, amount')
      .eq('tenant_id', auth.tenantId);

    let totalLoanPayable = 0;
    for (const l of loans || []) {
      const amt = Number(l.amount) || 0;
      if (l.type === 'borrowed') totalLoanPayable += amt;
      else totalLoanPayable -= amt;
    }

    // Baseline from opening balance
    const { data: opening } = await supabase
      .from('opening_balances')
      .select('total_receivable, total_payable')
      .eq('tenant_id', auth.tenantId)
      .single();

    const baselineReceivable = Number(opening?.total_receivable) || 0;
    const baselinePayable = Number(opening?.total_payable) || 0;

    return successResponse({
      receivable: {
        baseline: baselineReceivable,
        ledgerNet: totalCustomerReceivable,
        totalCustomerDue: Math.max(0, baselineReceivable + totalCustomerReceivable),
      },
      payable: {
        baseline: baselinePayable,
        ledgerNet: totalLoanPayable,
        totalLoanPayable: Math.max(0, baselinePayable + totalLoanPayable),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
