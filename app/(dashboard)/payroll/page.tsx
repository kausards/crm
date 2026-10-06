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
  Search,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

// Shadcn imports
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Input } from '@/components/ui/shadcn/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";

// Old UI components
import { Modal } from '@/components/ui/Modal';
import { Input as FormInput } from '@/components/ui/Input';
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
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pb-14">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salary & Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff salaries and attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 p-0 h-full text-sm font-medium focus:ring-0 cursor-pointer focus-visible:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSalaryExcel}
            disabled={isExportingSalary}
          >
            <Download className="w-4 h-4 mr-2 text-muted-foreground" />
            {isExportingSalary ? 'Exporting...' : 'Export Sheet'}
          </Button>

          <Button
            size="sm"
            onClick={() => setAddEmployeeOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Enroll Staff
          </Button>
        </div>
      </div>

      {/* 2. 4 Summary Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatBDT(salarySummary?.total_base_budget ?? totalBaseBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {salarySummary?.total_employees ?? rawEmployees.length} staff enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">
              {formatBDT(netDisbursable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {salarySummary?.paid_count ?? 0} disbursed this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deductions</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-destructive">
              {formatBDT(salarySummary?.total_deductions ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {salarySummary?.cumulative_unpaid_days ?? 0} leave days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {salarySummary?.pending_count ?? rawEmployees.length} Staff
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Employee Directory (7 Cols) */}
        <Card className="lg:col-span-7 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b p-4 sm:p-6 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Staff Directory
                <Badge variant="secondary" className="px-1.5 py-0.5 min-w-[24px] justify-center">{rawEmployees.length}</Badge>
              </CardTitle>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter staff..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 w-[150px] sm:w-[200px]"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-hidden flex-1">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-16 text-center text-sm font-medium text-muted-foreground">
                No employees found. Enroll staff above.
              </div>
            ) : (
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Divisor</TableHead>
                      <TableHead className="text-right">Status & Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => {
                      const isSelected = currentEmp?.id === emp.id;
                      const isPaid = salarySummary?.paid_employee_ids?.includes(emp.id);

                      return (
                        <TableRow
                          key={emp.id}
                          onClick={() => setActiveEmployee(emp)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0 border text-muted-foreground">
                                {emp.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{emp.name}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{emp.phone || 'No phone'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {formatBDT(emp.monthly_salary)}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">
                            {emp.salary_divisor}d
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPaid ? (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-500/10">
                                  Paid
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">
                                  Pending
                                </Badge>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEmpModal(emp);
                                }}
                                title="Edit Staff Member"
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Deactivate employee "${emp.name}"?`)) {
                                    deactivateEmpMutation.mutate(emp.id);
                                  }
                                }}
                                title="Deactivate Staff Member"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Attendance & Payout Calculator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {currentEmp ? (
            <>
              {/* Profile Card Header */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted text-muted-foreground font-bold flex items-center justify-center text-lg border shadow-sm shrink-0">
                      {currentEmp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{currentEmp.name}</h3>
                      <p className="text-sm text-muted-foreground">{currentEmp.phone || 'Employee'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Contract Base</span>
                    <div className="font-mono font-bold text-lg">{formatBDT(currentEmp.monthly_salary)}</div>
                  </div>
                </CardHeader>
              </Card>

              {/* Attendance Marker Controls */}
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Log Attendance</span>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-[140px] h-9"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'present' })}
                      disabled={markAttendanceMutation.isPending}
                      className="text-emerald-600 border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 h-9"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Present
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'half' })}
                      disabled={markAttendanceMutation.isPending}
                      className="text-amber-600 border-amber-500 hover:bg-amber-500/10 hover:text-amber-600 h-9"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Half Day
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => markAttendanceMutation.mutate({ empId: currentEmp.id, status: 'absent' })}
                      disabled={markAttendanceMutation.isPending}
                      className="text-rose-600 border-rose-500 hover:bg-rose-500/10 hover:text-rose-600 h-9"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Absent
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance History Calendar Grid */}
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedMonth} Attendance Calendar</span>
                    </span>
                    <Badge variant="secondary" className="px-2 font-semibold">
                      {attendanceHistoryData?.records?.length || 0} logged
                    </Badge>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground font-semibold uppercase">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {(() => {
                      const [y, m] = selectedMonth.split('-').map(Number);
                      const daysCount = new Date(y, m, 0).getDate();
                      const firstDay = new Date(y, m - 1, 1).getDay();
                      const offset = (firstDay + 6) % 7;
                      const items = [];

                      for (let i = 0; i < offset; i++) {
                        items.push(<div key={`empty-${i}`} className="h-8 rounded-md bg-transparent" />);
                      }

                      for (let d = 1; d <= daysCount; d++) {
                        const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                        const rec = attendanceHistoryData?.records?.find((r) => r.date === dStr);
                        const isToday = dStr === new Date().toISOString().slice(0, 10);
                        const isSelectedDay = dStr === selectedDate;

                        let cellColor = 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted';
                        if (rec?.status === 'present') {
                          cellColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold';
                        } else if (rec?.status === 'half') {
                          cellColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold';
                        } else if (rec?.status === 'absent') {
                          cellColor = 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold';
                        }

                        items.push(
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDate(dStr)}
                            title={`${dStr}: ${rec?.status || 'No entry'}`}
                            className={`h-8 rounded-md flex items-center justify-center text-xs font-mono border transition-all ${cellColor} ${
                              isSelectedDay ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
                            } ${isToday ? 'underline underline-offset-2 decoration-2' : ''}`}
                          >
                            {d}
                          </button>
                        );
                      }
                      return items;
                    })()}
                  </div>

                  {/* Legend & Summary */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground pt-4 border-t">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Present ({(attendanceHistoryData?.records || []).filter(r => r.status === 'present').length})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Half ({(attendanceHistoryData?.records || []).filter(r => r.status === 'half').length})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>Absent ({(attendanceHistoryData?.records || []).filter(r => r.status === 'absent').length})</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Calculation Breakdown */}
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <span className="font-semibold text-sm block mb-2">
                    {selectedMonth} Payout Calculation
                  </span>

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Contract Monthly Gross:</span>
                    <span className="font-mono text-foreground font-semibold">{formatBDT(currentEmp.monthly_salary)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Daily Rate:</span>
                    <span className="font-mono">৳{Math.round(currentEmp.monthly_salary / currentEmp.salary_divisor)}/day ({currentEmp.salary_divisor}d)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Days Recorded Present:</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      {previewLoading ? '...' : `${salaryPreview?.daysPresent ?? 26} Days`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-destructive border-t pt-3 mt-1">
                    <span>Absenteeism Deduction:</span>
                    <span className="font-mono font-semibold">
                      {previewLoading ? '...' : `- ${formatBDT(salaryPreview?.deduction ?? 0)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-3 rounded-xl border text-sm mt-3">
                    <span className="font-semibold">Net Disbursable:</span>
                    <span className="font-mono font-bold text-emerald-600 text-base">
                      {previewLoading ? '...' : formatBDT(salaryPreview?.netPayable ?? currentEmp.monthly_salary)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Disburse CTA */}
              <Button
                onClick={() =>
                  finalizeSalaryMutation.mutate({
                    month: `${selectedMonth}-01`,
                    payment_method: 'bank',
                  })
                }
                disabled={finalizeSalaryMutation.isPending}
                className="w-full h-11 text-base font-semibold"
              >
                {finalizeSalaryMutation.isPending ? 'Booking Payout...' : 'Finalize & Record Salary'}
              </Button>
            </>
          ) : (
            <Card className="flex items-center justify-center py-24 text-sm font-medium text-muted-foreground">
              Select or enroll an employee to inspect attendance.
            </Card>
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
        <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
          <FormInput
            label="Staff Full Name"
            placeholder="e.g. Tariqul Islam"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            required
          />

          <FormInput
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={empPhone}
            onChange={(e) => setEmpPhone(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              type="number"
              min="1"
              label="Monthly Base (৳)"
              placeholder="25000"
              value={empSalary}
              onChange={(e) => setEmpSalary(Number(e.target.value))}
              required
            />
            <FormInput
              type="number"
              min="20"
              max="31"
              label="Divisor (Days/Mo)"
              value={empDivisor}
              onChange={(e) => setEmpDivisor(Number(e.target.value))}
              required
            />
          </div>

          <FormInput
            type="date"
            label="Joining Date"
            value={empJoined}
            onChange={(e) => setEmpJoined(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddEmployeeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEmpMutation.isPending}
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
        <form onSubmit={handleEditEmpSubmit} className="space-y-4 mt-2">
          <FormInput
            label="Staff Full Name"
            placeholder="e.g. Tariqul Islam"
            value={editEmpName}
            onChange={(e) => setEditEmpName(e.target.value)}
            required
          />

          <FormInput
            label="Phone Number"
            placeholder="017xxxxxxxx"
            value={editEmpPhone}
            onChange={(e) => setEditEmpPhone(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              type="number"
              min="1"
              label="Monthly Base (৳)"
              value={editEmpSalary || ''}
              onChange={(e) => setEditEmpSalary(Number(e.target.value))}
              required
            />
            <FormInput
              type="number"
              min="20"
              max="31"
              label="Divisor (Days/Mo)"
              value={editEmpDivisor}
              onChange={(e) => setEditEmpDivisor(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditEmployeeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editEmpMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
