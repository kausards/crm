export interface SalaryCalculationInput {
  monthlySalary: number;
  salaryDivisor?: number;
  daysAbsent: number;
  manualOverride?: number | null;
}

export interface SalaryCalculationOutput {
  grossSalary: number;
  salaryDivisor: number;
  perDayRate: number;
  daysAbsent: number;
  deduction: number;
  calculatedPayable: number;
  manualOverride: number | null;
  netPayable: number;
}

/**
 * Deterministically computes employee salary payable based on attendance
 * Default divisor is 30, per-day rate = monthly_salary / divisor.
 * If manual_override is supplied, netPayable is set to manual_override.
 */
export function calculateSalaryPayable(input: SalaryCalculationInput): SalaryCalculationOutput {
  const grossSalary = Number(input.monthlySalary) || 0;
  const salaryDivisor = Math.max(1, Number(input.salaryDivisor) || 30);
  const daysAbsent = Math.max(0, Number(input.daysAbsent) || 0);

  const perDayRate = grossSalary / salaryDivisor;
  const deduction = Math.round(perDayRate * daysAbsent * 100) / 100;
  const calculatedPayable = Math.max(0, Math.round((grossSalary - deduction) * 100) / 100);

  const manualOverride =
    input.manualOverride !== undefined && input.manualOverride !== null
      ? Math.max(0, Number(input.manualOverride))
      : null;

  const netPayable = manualOverride !== null ? manualOverride : calculatedPayable;

  return {
    grossSalary,
    salaryDivisor,
    perDayRate: Math.round(perDayRate * 100) / 100,
    daysAbsent,
    deduction,
    calculatedPayable,
    manualOverride,
    netPayable,
  };
}
