import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { finalizeSalaryRunSchema } from '@/lib/validators/salary';
import { createClient } from '@/lib/supabase/server';
import { calculateSalaryPayable } from '@/lib/accounting/salary';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { employeeId } = await params;
    const { searchParams } = new URL(req.url);

    const monthStr = searchParams.get('month') || new Date().toISOString().slice(0, 7) + '-01';
    const monthStart = monthStr.slice(0, 7) + '-01';
    // Compute the real last day of the month to avoid missing days in shorter months
    const [mYear, mMon] = monthStart.split('-').map(Number);
    const lastDayOfMonth = new Date(mYear, mMon, 0).getDate();
    const monthEnd = `${monthStart.slice(0, 7)}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const supabase = await createClient();

    // 1. Fetch employee
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (empErr || !employee) {
      return errorResponse('NOT_FOUND', 'Employee not found', 404);
    }

    // 2. Fetch attendance for month
    const { data: attendanceList } = await supabase
      .from('attendance')
      .select('status')
      .eq('employee_id', employeeId)
      .eq('tenant_id', auth.tenantId)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    let daysPresent = 0;
    let daysAbsent = 0;

    for (const record of attendanceList || []) {
      if (record.status === 'present') daysPresent += 1;
      else if (record.status === 'absent') daysAbsent += 1;
      else if (record.status === 'half') {
        daysPresent += 0.5;
        daysAbsent += 0.5;
      }
    }

    const calculation = calculateSalaryPayable({
      monthlySalary: Number(employee.monthly_salary),
      salaryDivisor: employee.salary_divisor,
      daysAbsent,
    });

    return successResponse({
      employee,
      month: monthStart,
      daysPresent,
      ...calculation,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { employeeId } = await params;
    const body = await req.json();

    const validated = finalizeSalaryRunSchema.parse({
      ...body,
      employee_id: employeeId,
    });

    const supabase = await createClient();

    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (!employee) {
      return errorResponse('NOT_FOUND', 'Employee not found', 404);
    }

    const calculation = calculateSalaryPayable({
      monthlySalary: Number(employee.monthly_salary),
      salaryDivisor: employee.salary_divisor,
      daysAbsent: validated.days_absent,
      manualOverride: validated.manual_override,
    });

    const { data: salaryRun, error } = await supabase
      .from('salary_runs')
      .insert({
        tenant_id: auth.tenantId,
        employee_id: employeeId,
        month: validated.month,
        days_present: validated.days_present,
        days_absent: validated.days_absent,
        gross_salary: calculation.grossSalary,
        deduction: calculation.deduction,
        net_payable: calculation.netPayable,
        manual_override: calculation.manualOverride,
        paid_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !salaryRun) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to save salary run', 500);
    }

    return successResponse(salaryRun, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
