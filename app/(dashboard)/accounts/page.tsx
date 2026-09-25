'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Download,
  Plus,
  Receipt,
  RotateCcw,
  DollarSign,
  PieChart,
  Calendar,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface PnLData {
  total_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  operational_costs: number;
  salaries_cost: number;
  return_costs: number;
  net_profit: number;
  net_margin_percent: number;
  orders_count: number;
}

interface BillCostItem {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  is_recurring: boolean;
}

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-09
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Expense form states
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState('office');
  const [isRecurring, setIsRecurring] = useState(false);

  const fromDate = `${selectedMonth}-01`;
  const toDate = `${selectedMonth}-31`;

  // Fetch PnL for selected month
  const { data: pnl, isLoading: pnlLoading } = useQuery<PnLData>({
    queryKey: ['accounts-pnl', selectedMonth],
    queryFn: () => fetchApi(`/api/v1/accounts/pnl?from=${fromDate}&to=${toDate}`),
  });

  // Fetch Bills & Expenses for selected month
  const { data: billsData, isLoading: billsLoading } = useQuery<{
    items: BillCostItem[];
  }>({
    queryKey: ['bill-costs', selectedMonth],
    queryFn: () => fetchApi(`/api/v1/bill-cost?from=${fromDate}&to=${toDate}&limit=100`),
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: (body: unknown) =>
      fetchApi('/api/v1/bill-cost', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Operating expense added to financial ledger!', 'success');
      setAddExpenseModalOpen(false);
      setExpenseName('');
      setExpenseAmount(0);
      queryClient.invalidateQueries({ queryKey: ['bill-costs'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to add expense', 'error');
    },
  });

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpenseMutation.mutate({
      name: expenseName,
      amount: Number(expenseAmount) || 0,
      date: expenseDate,
      category: expenseCategory,
      is_recurring: isRecurring,
      frequency: isRecurring ? 'monthly' : null,
    });
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/v1/export/monthly?month=${selectedMonth}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to generate Excel report');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Financial_Report_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('Excel Financial Report downloaded successfully!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const expenses = billsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Accounts & Profit & Loss (P&L)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Strict deterministic financial reporting with courier return loss accounting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            isLoading={isExporting}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddExpenseModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Primary Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Sales / Revenue"
          value={pnlLoading ? '...' : formatBDT(pnl?.total_revenue || 0)}
          subtitle={`${pnl?.orders_count || 0} completed orders in ${selectedMonth}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
        />

        <StatCard
          title="Cost of Goods (COGS)"
          value={pnlLoading ? '...' : formatBDT(pnl?.cogs || 0)}
          subtitle="Wholesale acquisition cost of sold goods"
          icon={<Receipt className="w-4 h-4 text-slate-400" />}
        />

        <StatCard
          title="Gross Profit"
          value={pnlLoading ? '...' : formatBDT(pnl?.gross_profit || 0)}
          subtitle={`Margin: ${pnl?.gross_margin_percent?.toFixed(1) || 0}%`}
          icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
        />

        <StatCard
          title="Net Profit (Final)"
          value={pnlLoading ? '...' : formatBDT(pnl?.net_profit || 0)}
          subtitle={`Net Margin: ${pnl?.net_margin_percent?.toFixed(1) || 0}%`}
          className={
            (pnl?.net_profit || 0) >= 0
              ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/20'
              : 'border-rose-500/40 bg-gradient-to-b from-slate-900 to-rose-950/20'
          }
          icon={<PieChart className="w-4 h-4 text-emerald-400" />}
        />
      </div>

      {/* Income Statement Drilldown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Income Statement Breakdown — {selectedMonth}
        </h3>

        <div className="divide-y divide-slate-800 text-sm">
          {/* Revenue */}
          <div className="py-3 flex justify-between items-center">
            <span className="font-semibold text-slate-200">1. Total Revenue (Sales)</span>
            <span className="font-bold text-white font-mono">{formatBDT(pnl?.total_revenue || 0)}</span>
          </div>

          {/* COGS */}
          <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
            <span>less: Cost of Goods Sold (COGS)</span>
            <span className="font-mono text-slate-300">- {formatBDT(pnl?.cogs || 0)}</span>
          </div>

          {/* Gross Profit */}
          <div className="py-3 flex justify-between items-center font-bold text-indigo-300 bg-slate-950/40 px-3 rounded-lg">
            <span>= Gross Profit</span>
            <span className="font-mono">{formatBDT(pnl?.gross_profit || 0)}</span>
          </div>

          {/* Operating Costs */}
          <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
            <span>less: Operating Expenses (Rent, Bills, Marketing)</span>
            <span className="font-mono text-slate-300">- {formatBDT(pnl?.operational_costs || 0)}</span>
          </div>

          {/* Salaries */}
          <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
            <span>less: Staff Salaries / Payroll</span>
            <span className="font-mono text-slate-300">- {formatBDT(pnl?.salaries_cost || 0)}</span>
          </div>

          {/* Courier Returns */}
          <div className="py-3 flex justify-between items-center text-rose-400 pl-4">
            <span>less: Courier Return Losses (RTO Roundtrip Delivery Charges)</span>
            <span className="font-mono text-rose-300">- {formatBDT(pnl?.return_costs || 0)}</span>
          </div>

          {/* Net Profit */}
          <div className="py-3.5 flex justify-between items-center font-bold text-base bg-slate-950/80 px-4 rounded-xl border border-slate-800">
            <span className={(pnl?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              = Net Operating Profit
            </span>
            <span className={`font-mono text-lg ${(pnl?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBDT(pnl?.net_profit || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Expenses Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Operational Expenses Log
            </h3>
            <p className="text-xs text-slate-400">
              Rent, bills, marketing, courier penalties, and office supplies
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddExpenseModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </Button>
        </div>

        {billsLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No operational expenses recorded for {selectedMonth}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Title / Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Recurring</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-400">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.is_recurring ? (
                        <span className="text-emerald-400 text-[11px] font-medium">Monthly Auto</span>
                      ) : (
                        'One-time'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {formatBDT(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        title="Record Operational Expense"
        maxWidth="md"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Shop Rent / FB Ads / Electricity Bill"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              step="1"
              label="Amount (৳)"
              placeholder="5000"
              value={expenseAmount || ''}
              onChange={(e) => setExpenseAmount(Number(e.target.value))}
              required
            />

            <Input
              type="date"
              label="Expense Date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          <Select
            label="Category"
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            options={[
              { value: 'rent', label: 'Store / Warehouse Rent' },
              { value: 'marketing', label: 'Marketing / Facebook Ads' },
              { value: 'office', label: 'Office Supplies / Utilities' },
              { value: 'packaging', label: 'Packaging Materials' },
              { value: 'other', label: 'Other Miscellaneous Cost' },
            ]}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_recurring_check"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="is_recurring_check" className="text-xs text-slate-300">
              Auto-generate monthly recurring expense on the 1st of every month
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddExpenseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={addExpenseMutation.isPending}
            >
              Save Expense Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
