'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

interface EmployeeItem {
  id: string;
  name: string;
  phone: string | null;
  monthly_salary: number;
  salary_divisor: number;
  joined_at: string;
}

interface SalaryCalculation {
  employee: EmployeeItem;
  month: string;
  daysPresent: number;
  grossSalary: number;
  deduction: number;
  netPayable: number;
  perDayRate: number;
}

interface SalarySummary {
  month: string;
  total_base_budget: number;
  total_disbursed: number;
  total_deductions: number;
  cumulative_unpaid_days: number;
  total_employees: number;
  paid_count: number;
  pending_count: number;
  disbursed_pct: number;
  paid_employee_ids: string[];
}

export default function PayrollPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-09
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchFilter, setSearchFilter] = useState('');
  const [isExportingSalary, setIsExportingSalary] = useState(false);

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<EmployeeItem | null>(null);

  // Form states for New Employee
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(25000);
  const [empDivisor, setEmpDivisor] = useState<number>(30);
  const [empJoined, setEmpJoined] = useState(new Date().toISOString().slice(0, 10));

  // Fetch employees
  const { data: employees, isLoading } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi('/api/v1/employees'),
  });

  // Fetch salary summary telemetry for selected month
  const { data: salarySummary } = useQuery<SalarySummary>({
    queryKey: ['salary-summary', selectedMonth],
    queryFn: () => fetchApi(`/api/v1/salary/summary?month=${selectedMonth}`),
  });

  // Fetch salary preview for active employee
  const { data: salaryPreview, isLoading: previewLoading } = useQuery<SalaryCalculation>({
    queryKey: ['salary-preview', activeEmployee?.id, selectedMonth],
    queryFn: () => fetchApi(`/api/v1/salary/${activeEmployee?.id}/run?month=${selectedMonth}-01`),
    enabled: Boolean(activeEmployee),
  });

  // Create Employee Mutation
  const createEmpMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/employees', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Employee enrolled into payroll directory!', 'success');
      setAddEmployeeOpen(false);
      setEmpName('');
      setEmpPhone('');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to add employee', 'error');
    },
  });

  // Mark Attendance Mutation
  const markAttendanceMutation = useMutation({
    mutationFn: ({ empId, status }: { empId: string; status: 'present' | 'absent' | 'half' }) =>
      fetchApi(`/api/v1/salary/${empId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          status,
        }),
      }),
    onSuccess: () => {
      toast('Attendance logged!', 'success');
      queryClient.invalidateQueries({ queryKey: ['salary-preview'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to log attendance', 'error');
    },
  });

  // Finalize Salary Run Mutation
  const finalizeSalaryMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi(`/api/v1/salary/${activeEmployee?.id}/run`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Salary payout finalized and booked to accounting ledger!', 'success');
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['salary-preview'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to record salary run', 'error');
    },
  });

  const handleDownloadSalaryExcel = async () => {
    setIsExportingSalary(true);
    try {
      const res = await fetch(`/api/v1/export/salary?month=${selectedMonth}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate Salary report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary_Report_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('Salary Excel report downloaded successfully!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
    } finally {
      setIsExportingSalary(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEmpMutation.mutate({
      name: empName,
      phone: empPhone || undefined,
      monthly_salary: Number(empSalary),
      salary_divisor: Number(empDivisor),
      joined_at: empJoined,
    });
  };

  const rawEmployees = employees || [];
  const filteredEmployees = rawEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (emp.phone && emp.phone.includes(searchFilter))
  );

  const currentEmp = activeEmployee || (rawEmployees.length > 0 ? rawEmployees[0] : null);

  const totalBaseBudget = rawEmployees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);
  const netDisbursable = salarySummary?.total_disbursed ?? 0;

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto pb-12">
      {/* SUB-NAVIGATION BAR & ACTION CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low shadow-inner">
          <Link
            href="/accounts"
            className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/accounts"
            className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Bill & Cost
          </Link>
          {/* Active Tab */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container text-white font-semibold font-label-md text-label-md shadow-md">
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>Salary & Attendance</span>
          </div>
          <Link
            href="/due-loan"
            className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Due & Loan Ledger
          </Link>
        </nav>

        {/* Action Controls right */}
        <div className="flex items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-white/[0.08] rounded-xl text-xs font-semibold text-white focus:outline-none"
          />

          <button
            onClick={handleDownloadSalaryExcel}
            disabled={isExportingSalary}
            className="flex items-center gap-1.5 bg-surface-container-low border border-white/[0.08] hover:border-white/20 text-xs px-3.5 py-2 rounded-xl text-white transition-colors"
            type="button"
            title="Download monthly salary sheet to Excel"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">download</span>
            <span>{isExportingSalary ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => setAddEmployeeOpen(true)}
            className="flex items-center gap-1.5 bg-surface-container-low border border-white/[0.08] hover:border-white/20 text-xs px-3.5 py-2 rounded-xl text-white transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">person_add</span>
            <span>+ Add Employee</span>
          </button>

          <button
            onClick={() => {
              if (currentEmp) {
                finalizeSalaryMutation.mutate({
                  month: `${selectedMonth}-01`,
                  payment_method: 'bank',
                });
              } else {
                toast('Please select an employee first', 'info');
              }
            }}
            disabled={finalizeSalaryMutation.isPending}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-xs font-semibold px-4 py-2 rounded-xl text-white shadow-lg shadow-primary-container/20 hover:brightness-110 transition-all active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">payments</span>
            <span>{finalizeSalaryMutation.isPending ? 'Processing...' : 'Run Payroll'}</span>
          </button>
        </div>
      </div>

      {/* 1. FOUR TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Payroll Budget */}
        <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden group hover:border-primary/40 transition-all shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="uppercase tracking-wider font-semibold text-[10px]">Financial Allocation</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
            </div>
          </div>
          <div className="font-sora text-2xl font-bold text-white tracking-tight flex items-baseline gap-1">
            {formatBDT(salarySummary?.total_base_budget ?? totalBaseBudget)}
          </div>
          <div className="mt-2.5 text-xs text-on-surface-variant flex items-center justify-between">
            <span>Base monthly contract pool</span>
            <span className="text-white font-medium">{salarySummary?.total_employees ?? rawEmployees.length} Enrolled</span>
          </div>
        </div>

        {/* Metric 2: Net Realized Disbursable */}
        <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden group hover:border-tertiary/40 transition-all shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/10 rounded-full blur-xl group-hover:bg-tertiary/20 transition-all"></div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="uppercase tracking-wider font-semibold text-[10px] text-tertiary">Net Realized Disbursable</span>
            <div className="w-7 h-7 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">verified</span>
            </div>
          </div>
          <div className="font-sora text-2xl font-bold text-tertiary tracking-tight flex items-baseline gap-1">
            {formatBDT(netDisbursable)}
          </div>
          <div className="mt-2.5 text-xs text-on-surface-variant flex items-center justify-between">
            <span>Total paid out this month</span>
            <span className="text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
              {formatBDT(salarySummary?.total_deductions ?? 0)} Deductions
            </span>
          </div>
        </div>

        {/* Metric 3: Absence Deductions */}
        <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden group hover:border-error/40 transition-all shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-xl group-hover:bg-error/20 transition-all"></div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="uppercase tracking-wider font-semibold text-[10px] text-error">Absenteeism & LOP Deduct</span>
            <div className="w-7 h-7 rounded-lg bg-error/10 border border-error/30 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[16px]">trending_down</span>
            </div>
          </div>
          <div className="font-sora text-2xl font-bold text-error tracking-tight flex items-baseline gap-1">
            {formatBDT(salarySummary?.total_deductions ?? 0)}
          </div>
          <div className="mt-2.5 text-xs text-on-surface-variant flex items-center justify-between">
            <span>{salarySummary?.cumulative_unpaid_days ?? 0} Cumulative Unpaid Days</span>
            <span className="text-error text-[10px] font-medium">Recorded Offsets</span>
          </div>
        </div>

        {/* Metric 4: Settled Staff */}
        <div className="bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden group hover:border-secondary/40 transition-all shadow-xl">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-all"></div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="uppercase tracking-wider font-semibold text-[10px] text-secondary">Settled Staff</span>
            <div className="w-7 h-7 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            </div>
          </div>
          <div className="font-sora text-2xl font-bold text-white tracking-tight flex items-baseline gap-1">
            {salarySummary?.paid_count ?? 0} <span className="text-on-surface-variant text-base font-normal">/ {salarySummary?.total_employees ?? rawEmployees.length} Paid</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full"
                style={{ width: `${salarySummary?.disbursed_pct ?? 0}%` }}
              ></div>
            </div>
            <div className="mt-1.5 text-[10px] text-on-surface-variant flex items-center justify-between">
              <span>{salarySummary?.disbursed_pct ?? 0}% Disbursed</span>
              <span className="text-amber-400 font-semibold">{salarySummary?.pending_count ?? rawEmployees.length} Pending Approval</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: EMPLOYEE PAYROLL DIRECTORY (7 Cols) */}
        <div className="lg:col-span-7 bg-surface-container-low border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          {/* Table Header / Controls */}
          <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container/50">
            <div>
              <h2 className="font-sora font-semibold text-sm text-white flex items-center gap-2">
                Employee Payroll Directory
                <span className="text-[10px] font-mono font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {rawEmployees.length} Staff
                </span>
              </h2>
              <p className="text-[11px] text-on-surface-variant">Tap any employee to review attendance matrix and calculate net payout</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter staff..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-surface-container border border-white/[0.08] rounded-lg pl-7 pr-3 py-1 text-xs text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary w-32 sm:w-40"
                />
                <span className="material-symbols-outlined absolute left-2 top-1.5 text-[14px] text-on-surface-variant">
                  search
                </span>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-on-surface-variant">Loading staff directory...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-16 text-center text-xs text-on-surface-variant">
                No employees enrolled. Click "+ Add Employee" above.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase font-semibold tracking-wider text-on-surface-variant bg-surface-container-lowest/60">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Base Salary</th>
                    <th className="py-3 px-3">Divisor</th>
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredEmployees.map((emp) => {
                    const isSelected = currentEmp?.id === emp.id;

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setActiveEmployee(emp)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-l-4 border-l-primary'
                            : 'hover:bg-surface-container/60'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white font-bold flex items-center justify-center text-xs ring-2 ring-primary/40">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {emp.name}
                                {salarySummary?.paid_employee_ids?.includes(emp.id) ? (
                                  <span className="text-[9px] font-semibold bg-tertiary/15 text-tertiary px-1.5 py-0.5 rounded font-mono">
                                    PAID
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded font-mono">
                                    PENDING
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Active Inspect"></span>
                                )}
                              </div>
                              <div className="text-[10px] text-on-surface-variant font-mono">{emp.phone || 'Staff Member'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-white">{formatBDT(emp.monthly_salary)}</td>
                        <td className="py-3 px-3 text-on-surface-variant font-mono">{emp.salary_divisor}d Divisor</td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-white/[0.08] text-[11px] font-semibold text-primary"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE & PAYOUT CALCULATOR (5 Cols) */}
        <div className="lg:col-span-5 bg-surface-container-low border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
          {currentEmp ? (
            <>
              {/* Selected Employee Profile Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white font-bold flex items-center justify-center text-base shadow-lg">
                    {currentEmp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-sora font-bold text-base text-white">{currentEmp.name}</h3>
                    <p className="text-xs text-on-surface-variant font-mono">{currentEmp.phone || 'No phone recorded'}</p>
                    <span className="inline-block mt-1 text-[10px] font-medium text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/20">
                      Enrolled: {formatDate(currentEmp.joined_at)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-mono">Contract Base</span>
                  <div className="font-sora font-bold text-base text-primary">{formatBDT(currentEmp.monthly_salary)}</div>
                </div>
              </div>

              {/* Attendance Marker Controls for Today / Selected Date */}
              <div className="p-4 rounded-xl bg-surface-container/60 border border-white/[0.04] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-sora text-xs font-semibold text-white">Log Attendance</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-surface-container text-xs px-2.5 py-1 rounded-lg border border-white/[0.08] text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'present' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-2 rounded-xl bg-tertiary/15 hover:bg-tertiary/25 text-tertiary font-semibold text-xs border border-tertiary/30 transition flex items-center justify-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Present</span>
                  </button>
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'half' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-semibold text-xs border border-amber-500/30 transition flex items-center justify-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">timelapse</span>
                    <span>Half Day</span>
                  </button>
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'absent' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-2 rounded-xl bg-error/15 hover:bg-error/25 text-error font-semibold text-xs border border-error/30 transition flex items-center justify-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Absent</span>
                  </button>
                </div>
              </div>

              {/* Real-time Payout Calculation Waterfall */}
              <div className="p-4 rounded-xl bg-surface-container/60 border border-white/[0.04] space-y-2.5 text-xs">
                <span className="font-sora text-xs font-semibold text-white block mb-2">
                  {selectedMonth} Payout Breakdown
                </span>

                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Contract Monthly Gross:</span>
                  <span className="font-semibold text-white">{formatBDT(currentEmp.monthly_salary)}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Daily Rate Divisor:</span>
                  <span className="font-mono text-white">{currentEmp.salary_divisor} Days (৳{Math.round(currentEmp.monthly_salary / currentEmp.salary_divisor)}/day)</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Days Recorded Present:</span>
                  <span className="font-semibold text-tertiary">
                    {previewLoading ? '...' : `${salaryPreview?.daysPresent ?? 26} Days`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-error border-t border-white/[0.04] pt-2">
                  <span>Absenteeism Deduction:</span>
                  <span className="font-semibold">
                    {previewLoading ? '...' : `- ${formatBDT(salaryPreview?.deduction ?? 0)}`}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface-container p-2.5 rounded-lg border border-white/[0.06] text-sm">
                  <span className="font-bold text-white">Net Salary Disbursable:</span>
                  <span className="font-sora font-bold text-tertiary text-base">
                    {previewLoading ? '...' : formatBDT(salaryPreview?.netPayable ?? currentEmp.monthly_salary)}
                  </span>
                </div>
              </div>

              {/* Disburse CTA Button */}
              <button
                onClick={() =>
                  finalizeSalaryMutation.mutate({
                    month: `${selectedMonth}-01`,
                    payment_method: 'bank',
                  })
                }
                disabled={finalizeSalaryMutation.isPending}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white font-semibold text-xs shadow-lg shadow-primary-container/20 hover:brightness-110 active:scale-95 transition"
                type="button"
              >
                {finalizeSalaryMutation.isPending ? 'Booking Payout...' : 'Finalize & Disburse Salary'}
              </button>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-on-surface-variant">
              Select or enroll an employee to inspect attendance and calculate monthly salary.
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {addEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-surface-container-low border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-white">Enroll New Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddEmployeeOpen(false)}
                className="text-on-surface-variant hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Staff Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tariqul Islam"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="017xxxxxxxx"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Base Monthly Salary (৳)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="25000"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Divisor (Days/Month)</label>
                  <input
                    type="number"
                    min="20"
                    max="31"
                    value={empDivisor}
                    onChange={(e) => setEmpDivisor(Number(e.target.value))}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Joining Date</label>
                <input
                  type="date"
                  value={empJoined}
                  onChange={(e) => setEmpJoined(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setAddEmployeeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmpMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white text-xs font-semibold shadow-lg shadow-primary-container/20 hover:brightness-110 transition active:scale-95"
                >
                  {createEmpMutation.isPending ? 'Enrolling...' : 'Enroll Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
