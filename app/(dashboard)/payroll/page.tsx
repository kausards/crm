'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  Download,
  Plus,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  UserCheck,
  CreditCard,
  Clock,
  XCircle,
  Pencil,
  Trash2,
  UserX,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchFilter, setSearchFilter] = useState('');
  const [isExportingSalary, setIsExportingSalary] = useState(false);

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<EmployeeItem | null>(null);

  // Form states for Edit Employee
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpSalary, setEditEmpSalary] = useState<number>(25000);
  const [editEmpDivisor, setEditEmpDivisor] = useState<number>(30);

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
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
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
      toast('Salary payout recorded in ledger!', 'success');
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['salary-preview'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to record salary run', 'error');
    },
  });

  // Edit Employee Mutation
  const editEmpMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Staff details updated successfully!', 'success');
      setEditEmployeeOpen(false);
      setEditingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update employee', 'error');
    },
  });

  // Deactivate Employee Mutation
  const deactivateEmpMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/employees/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast('Employee deactivated from active payroll directory', 'info');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to deactivate employee', 'error');
    },
  });

  const openEditEmpModal = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditEmpName(emp.name);
    setEditEmpPhone(emp.phone || '');
    setEditEmpSalary(emp.monthly_salary);
    setEditEmpDivisor(emp.salary_divisor || 30);
    setEditEmployeeOpen(true);
  };

  const handleEditEmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    editEmpMutation.mutate({
      id: editingEmployee.id,
      body: {
        name: editEmpName,
        phone: editEmpPhone || null,
        monthly_salary: Number(editEmpSalary),
        salary_divisor: Number(editEmpDivisor),
      },
    });
  };

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
      toast('Salary Excel report downloaded!', 'success');
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

  // Attendance history query for current employee in selected month
  const { data: attendanceHistoryData } = useQuery<{
    month: string;
    records: Array<{ date: string; status: 'present' | 'absent' | 'half' }>;
  }>({
    queryKey: ['attendance-history', currentEmp?.id, selectedMonth],
    queryFn: () => fetchApi(`/api/v1/salary/${currentEmp!.id}/attendance?month=${selectedMonth}`),
    enabled: Boolean(currentEmp),
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/25">
              Payroll Engine
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight mt-1.5">
            Salary &amp; Attendance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-body">
            Automated attendance deduction, per-day salary divisor &amp; digital disbursement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-violet-400 mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleDownloadSalaryExcel}
            disabled={isExportingSalary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-label font-medium text-slate-200 transition-all disabled:opacity-50"
            type="button"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingSalary ? 'Exporting...' : 'Export Sheet'}</span>
          </button>

          <button
            onClick={() => setAddEmployeeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
            type="button"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Staff</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 relative overflow-hidden border-l-2 border-l-violet-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Base Payroll Budget</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-white mt-2 tabular-nums">
            {formatBDT(salarySummary?.total_base_budget ?? totalBaseBudget)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-body">
            {salarySummary?.total_employees ?? rawEmployees.length} enrolled staff
          </p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Net Disbursed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-emerald-400 mt-2 tabular-nums font-mono">
            {formatBDT(netDisbursable)}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-body">
            {salarySummary?.paid_count ?? 0} staff disbursed this month
          </p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden border-l-2 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Absence Deductions</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-rose-400 mt-2 tabular-nums font-mono">
            {formatBDT(salarySummary?.total_deductions ?? 0)}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1 font-body">
            {salarySummary?.cumulative_unpaid_days ?? 0} cumulative leave days
          </p>
        </div>

        <div className="glass-card p-4 relative overflow-hidden border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase tracking-wider text-slate-400 font-semibold">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-headline font-bold text-amber-400 mt-2 tabular-nums">
            {salarySummary?.pending_count ?? rawEmployees.length} Staff
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1 font-body">
            Awaiting month-end run
          </p>
        </div>
      </div>

      {/* 3. Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Employee Directory (7 Cols) */}
        <div className="lg:col-span-7 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="font-headline font-bold text-sm text-white flex items-center gap-2">
                Staff Directory
                <span className="text-[10px] font-mono bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/25">
                  {rawEmployees.length}
                </span>
              </h2>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter staff..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="glass-input pl-8 pr-3 py-1.5 text-xs w-36 sm:w-48"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[14px] text-slate-400">
                search
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : filteredEmployees.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No employees found. Enroll staff above.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">Staff Member</th>
                    <th className="py-3 px-3 font-semibold">Base Salary</th>
                    <th className="py-3 px-3 font-semibold">Divisor</th>
                    <th className="py-3 px-3 text-right font-semibold">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredEmployees.map((emp) => {
                    const isSelected = currentEmp?.id === emp.id;
                    const isPaid = salarySummary?.paid_employee_ids?.includes(emp.id);

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setActiveEmployee(emp)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-violet-600/15 border-l-2 border-l-violet-500'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-white block truncate">{emp.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{emp.phone || 'No phone'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-200">
                          {formatBDT(emp.monthly_salary)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {emp.salary_divisor}d
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Pending
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEmpModal(emp);
                              }}
                              title="Edit Staff Member"
                              className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Deactivate employee "${emp.name}"?`)) {
                                  deactivateEmpMutation.mutate(emp.id);
                                }
                              }}
                              title="Deactivate Staff Member"
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Attendance & Payout Calculator (5 Cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-5">
          {currentEmp ? (
            <>
              {/* Profile Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white font-headline font-bold flex items-center justify-center text-sm shadow-md">
                    {currentEmp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-sm text-white">{currentEmp.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{currentEmp.phone || 'Employee'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-label">Contract Base</span>
                  <div className="font-mono font-bold text-sm text-violet-300">{formatBDT(currentEmp.monthly_salary)}</div>
                </div>
              </div>

              {/* Attendance Marker Controls */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white font-label">Log Attendance</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="glass-input text-xs px-2.5 py-1 text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'present' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-label font-medium text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-1"
                    type="button"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Present</span>
                  </button>
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'half' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-label font-medium text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-1"
                    type="button"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Half Day</span>
                  </button>
                  <button
                    onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'absent' })}
                    disabled={markAttendanceMutation.isPending}
                    className="py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-label font-medium text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1"
                    type="button"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>

              {/* Attendance History Calendar Grid */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white font-label flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    <span>{selectedMonth} Attendance Calendar</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {attendanceHistoryData?.records?.length || 0} logged
                  </span>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 font-label uppercase">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const [y, m] = selectedMonth.split('-').map(Number);
                    const daysCount = new Date(y, m, 0).getDate();
                    const firstDay = new Date(y, m - 1, 1).getDay();
                    const offset = (firstDay + 6) % 7;
                    const items = [];

                    for (let i = 0; i < offset; i++) {
                      items.push(<div key={`empty-${i}`} className="h-7 rounded bg-transparent" />);
                    }

                    for (let d = 1; d <= daysCount; d++) {
                      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const rec = attendanceHistoryData?.records?.find((r) => r.date === dStr);
                      const isToday = dStr === new Date().toISOString().slice(0, 10);
                      const isSelectedDay = dStr === selectedDate;

                      let cellColor = 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:border-white/20';
                      if (rec?.status === 'present') {
                        cellColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
                      } else if (rec?.status === 'half') {
                        cellColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
                      } else if (rec?.status === 'absent') {
                        cellColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
                      }

                      items.push(
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(dStr)}
                          title={`${dStr}: ${rec?.status || 'No entry'}`}
                          className={`h-7 rounded flex items-center justify-center text-[11px] font-mono border transition-all ${cellColor} ${
                            isSelectedDay ? 'ring-2 ring-violet-500 shadow-sm' : ''
                          } ${isToday ? 'underline underline-offset-2' : ''}`}
                        >
                          {d}
                        </button>
                      );
                    }
                    return items;
                  })()}
                </div>

                {/* Legend & Summary */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Present ({(attendanceHistoryData?.records || []).filter(r => r.status === 'present').length})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Half ({(attendanceHistoryData?.records || []).filter(r => r.status === 'half').length})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Absent ({(attendanceHistoryData?.records || []).filter(r => r.status === 'absent').length})</span>
                  </span>
                </div>
              </div>

              {/* Real-time Calculation Breakdown */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                <span className="font-headline font-semibold text-xs text-white block mb-1">
                  {selectedMonth} Payout Calculation
                </span>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Contract Monthly Gross:</span>
                  <span className="font-mono text-white">{formatBDT(currentEmp.monthly_salary)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Daily Rate:</span>
                  <span className="font-mono text-slate-300">৳{Math.round(currentEmp.monthly_salary / currentEmp.salary_divisor)}/day ({currentEmp.salary_divisor}d)</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Days Recorded Present:</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {previewLoading ? '...' : `${salaryPreview?.daysPresent ?? 26} Days`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-400 border-t border-white/[0.06] pt-1.5">
                  <span>Absenteeism Deduction:</span>
                  <span className="font-mono font-medium">
                    {previewLoading ? '...' : `- ${formatBDT(salaryPreview?.deduction ?? 0)}`}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white/[0.05] p-2 rounded-lg border border-white/10 text-xs mt-1">
                  <span className="font-semibold text-white">Net Disbursable:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {previewLoading ? '...' : formatBDT(salaryPreview?.netPayable ?? currentEmp.monthly_salary)}
                  </span>
                </div>
              </div>

              {/* Disburse CTA */}
              <button
                onClick={() =>
                  finalizeSalaryMutation.mutate({
                    month: `${selectedMonth}-01`,
                    payment_method: 'bank',
                  })
                }
                disabled={finalizeSalaryMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
                type="button"
              >
                {finalizeSalaryMutation.isPending ? 'Booking Payout...' : 'Finalize & Record Salary'}
              </button>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              Select or enroll an employee to inspect attendance.
            </div>
          )}
        </div>
      </div>

      {/* Enroll Employee Modal */}
      <Modal
        isOpen={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        title="Enroll New Staff"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Staff Full Name"
            placeholder="e.g. Tariqul Islam"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={empPhone}
            onChange={(e) => setEmpPhone(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              label="Monthly Base (৳)"
              placeholder="25000"
              value={empSalary}
              onChange={(e) => setEmpSalary(Number(e.target.value))}
              required
            />
            <Input
              type="number"
              min="20"
              max="31"
              label="Divisor (Days/Mo)"
              value={empDivisor}
              onChange={(e) => setEmpDivisor(Number(e.target.value))}
              required
            />
          </div>

          <Input
            type="date"
            label="Joining Date"
            value={empJoined}
            onChange={(e) => setEmpJoined(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddEmployeeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createEmpMutation.isPending}
            >
              Enroll Staff
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={editEmployeeOpen}
        onClose={() => setEditEmployeeOpen(false)}
        title="Edit Staff Member"
        maxWidth="md"
      >
        <form onSubmit={handleEditEmpSubmit} className="space-y-4">
          <Input
            label="Staff Full Name"
            placeholder="e.g. Tariqul Islam"
            value={editEmpName}
            onChange={(e) => setEditEmpName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={editEmpPhone}
            onChange={(e) => setEditEmpPhone(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              label="Monthly Base (৳)"
              value={editEmpSalary || ''}
              onChange={(e) => setEditEmpSalary(Number(e.target.value))}
              required
            />
            <Input
              type="number"
              min="20"
              max="31"
              label="Divisor (Days/Mo)"
              value={editEmpDivisor}
              onChange={(e) => setEditEmpDivisor(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditEmployeeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={editEmpMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
