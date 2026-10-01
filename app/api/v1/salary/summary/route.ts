import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const rawMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const monthStart = rawMonth.length === 7 ? `${rawMonth}-01` : rawMonth;
    const monthShort = rawMonth.slice(0, 7);

    // 1. Fetch active employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, phone, monthly_salary, salary_divisor, is_active')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true)
      .order('name');

    if (empErr) throw empErr;

    // 2. Fetch salary runs for this month
    const { data: runs, error: runsErr } = await supabase
      .from('salary_runs')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .in('month', [monthStart, monthShort]);

    if (runsErr) throw runsErr;

    const empList = employees || [];
    const runList = runs || [];

    const totalBaseBudget = empList.reduce(
      (sum, e) => sum + (Number(e.monthly_salary) || 0),
      0
    );

    const totalDisbursed = runList.reduce(
      (sum, r) => sum + (Number(r.net_payable) || 0),
      0
    );

    const totalDeductions = runList.reduce(
      (sum, r) => sum + (Number(r.deduction) || 0),
      0
    );

    const cumulativeUnpaidDays = runList.reduce(
      (sum, r) => sum + (Number(r.days_absent) || 0),
      0
    );

    const paidEmployeeIds = new Set(runList.map((r) => r.employee_id));
    const paidCount = paidEmployeeIds.size;
    const totalEmployees = empList.length;
    const pendingCount = Math.max(0, totalEmployees - paidCount);

    const disbursedPct =
      totalEmployees > 0
        ? Math.round((paidCount / totalEmployees) * 1000) / 10
        : 0;

    return successResponse({
      month: monthShort,
      total_base_budget: totalBaseBudget,
      total_disbursed: totalDisbursed,
      total_deductions: totalDeductions,
      cumulative_unpaid_days: cumulativeUnpaidDays,
      total_employees: totalEmployees,
      paid_count: paidCount,
      pending_count: pendingCount,
      disbursed_pct: disbursedPct,
      paid_employee_ids: Array.from(paidEmployeeIds),
      runs: runList,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
