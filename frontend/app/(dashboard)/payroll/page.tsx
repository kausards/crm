'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, CheckCircle2, XCircle, Clock, Calendar, Calculator, DollarSign } from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

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

export default function PayrollPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-09
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [salaryRunOpen, setSalaryRunOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<EmployeeItem | null>(null);

  // Form states for New Employee
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(15000);
  const [empDivisor, setEmpDivisor] = useState<number>(30);
  const [empJoined, setEmpJoined] = useState(new Date().toISOString().slice(0, 10));

  // Fetch employees
  const { data: employees, isLoading } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi('/api/v1/employees'),
  });

  // Fetch salary preview for active employee
  const { data: salaryPreview, isLoading: previewLoading } = useQuery<SalaryCalculation>({
    queryKey: ['salary-preview', activeEmployee?.id, selectedMonth],
    queryFn: () => fetchApi(`/api/v1/salary/${activeEmployee?.id}/run?month=${selectedMonth}-01`),
    enabled: Boolean(activeEmployee && salaryRunOpen),
  });

  // Create Employee Mutation
  const createEmpMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/employees', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Employee added to payroll system!', 'success');
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
      toast('Salary payout recorded and archived!', 'success');
      setSalaryRunOpen(false);
      setActiveEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to record salary run', 'error');
    },
  });

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

  const employeeList = employees || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            HR & Attendance Payroll Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Attendance-linked deterministic payroll calculations with customizable divisor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddEmployeeOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </Button>
        </div>
      </div>

      {/* Employees & Attendance Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Daily Attendance for {formatDate(selectedDate)}
          </span>
          <span className="text-xs text-slate-400">
            Total Staff: {employeeList.length}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading employee staff roster...
          </div>
        ) : employeeList.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No employees registered yet.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => setAddEmployeeOpen(true)}
            >
              Add First Staff Member
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Divisor</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Mark Attendance ({selectedDate})</th>
                  <th className="py-3 px-4 text-right">Payroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employeeList.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white">
                      {emp.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {emp.phone || '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {formatBDT(emp.monthly_salary)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {emp.salary_divisor} days
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(emp.joined_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            markAttendanceMutation.mutate({ empId: emp.id, status: 'present' })
                          }
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-medium transition-colors"
                        >
                          Present
                        </button>
                        <button
                          onClick={() =>
                            markAttendanceMutation.mutate({ empId: emp.id, status: 'half' })
                          }
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-medium transition-colors"
                        >
                          Half Day
                        </button>
                        <button
                          onClick={() =>
                            markAttendanceMutation.mutate({ empId: emp.id, status: 'absent' })
                          }
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[11px] font-medium transition-colors"
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveEmployee(emp);
                          setSalaryRunOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Run Salary</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        title="Add New Employee"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Rakib Hassan"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="018xxxxxxxx"
            value={empPhone}
            onChange={(e) => setEmpPhone(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              min="0"
              step="500"
              label="Monthly Base Salary (৳)"
              value={empSalary}
              onChange={(e) => setEmpSalary(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min="1"
              max="365"
              label="Salary Divisor (Days)"
              helperText="Standard BD divisor is 30 days"
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
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Salary Run Modal */}
      <Modal
        isOpen={salaryRunOpen}
        onClose={() => setSalaryRunOpen(false)}
        title={`Salary Run — ${activeEmployee?.name}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
            />
          </div>

          {previewLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Calculating salary based on attendance...
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Gross Salary:</span>
                <span className="font-semibold text-white">
                  {formatBDT(activeEmployee?.monthly_salary)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Salary Divisor:</span>
                <span className="text-slate-200">{activeEmployee?.salary_divisor} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Per Day Rate:</span>
                <span className="text-slate-200">{formatBDT(salaryPreview?.perDayRate || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Days Present:</span>
                <span className="text-emerald-400 font-semibold">
                  {salaryPreview?.daysPresent || 0} days
                </span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Absence Deduction:</span>
                <span>- {formatBDT(salaryPreview?.deduction || 0)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                <span>Net Payable:</span>
                <span className="text-emerald-400 font-mono text-base">
                  {formatBDT(salaryPreview?.netPayable || 0)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setSalaryRunOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={finalizeSalaryMutation.isPending}
              onClick={() => {
                if (salaryPreview) {
                  finalizeSalaryMutation.mutate({
                    month: `${selectedMonth}-01`,
                    days_present: Math.round(salaryPreview.daysPresent),
                    days_absent: Math.round(30 - salaryPreview.daysPresent),
                  });
                }
              }}
            >
              Confirm & Mark Paid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
