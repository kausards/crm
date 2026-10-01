'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  Download,
  Plus,
  Calendar,
  DollarSign,
  Boxes,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';

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

interface ProductPnLItem {
  productId: string;
  productName: string;
  sku: string | null;
  buyPrice: number;
  sellPrice: number;
  currentStock: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  marginPercent: number;
}

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'ledger'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingProductPnL, setIsExportingProductPnL] = useState(false);

  // Expense form states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState('office');
  const [isRecurring, setIsRecurring] = useState(false);

  const fromDate = `${selectedMonth}-01`;
  const [selYear, selMon] = selectedMonth.split('-').map(Number);
  const lastDayOfMonth = new Date(selYear, selMon, 0).getDate();
  const toDate = `${selectedMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

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

  // Fetch real per-product P&L data
  const { data: productPnLData, isLoading: productPnlLoading } = useQuery<ProductPnLItem[]>({
    queryKey: ['accounts-products-pnl'],
    queryFn: () => fetchApi('/api/v1/accounts/products-pnl'),
    enabled: activeTab === 'overview',
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

  // Update Expense Mutation
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      fetchApi(`/api/v1/bill-cost/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('Operating expense updated!', 'success');
      setAddExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpenseName('');
      setExpenseAmount(0);
      queryClient.invalidateQueries({ queryKey: ['bill-costs'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to update expense', 'error');
    },
  });

  // Delete Expense Mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/v1/bill-cost/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Expense deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['bill-costs'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pnl'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to delete expense', 'error');
    },
  });

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: expenseName,
      amount: Number(expenseAmount) || 0,
      date: expenseDate,
      category: expenseCategory,
      is_recurring: isRecurring,
      frequency: isRecurring ? 'monthly' : null,
    };
    if (editingExpenseId) {
      updateExpenseMutation.mutate({ id: editingExpenseId, body: payload });
    } else {
      addExpenseMutation.mutate(payload);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/v1/export/monthly?month=${selectedMonth}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate Excel report');
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

  const handleDownloadProductPnL = async () => {
    setIsExportingProductPnL(true);
    try {
      const res = await fetch('/api/v1/export/products-pnl', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate Product P&L report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Product_PnL_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('Product P&L Excel report downloaded successfully!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
    } finally {
      setIsExportingProductPnL(false);
    }
  };

  const rawExpenses: BillCostItem[] = Array.isArray(billsData)
    ? (billsData as unknown as BillCostItem[])
    : billsData?.items || [];

  const filteredExpenses = rawExpenses.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalRev = pnl?.total_revenue || 0;
  const cogsVal = pnl?.cogs || 0;
  const grossVal = pnl?.gross_profit || 0;
  const netVal = pnl?.net_profit || 0;
  const opCosts = pnl?.operational_costs || 0;
  const salariesCost = pnl?.salaries_cost || 0;
  const returnLoss = pnl?.return_costs || 0;
  const grossMarginPct = pnl?.gross_margin_percent?.toFixed(1) || '0.0';
  const netMarginPct = pnl?.net_margin_percent?.toFixed(1) || '0.0';

  const skuBreakdowns: ProductPnLItem[] = Array.isArray(productPnLData) ? productPnLData : [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/25">
              Deterministic Accounting
            </span>
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight mt-1.5">
            P&amp;L Accounts &amp; Cashflow
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-body">
            Reconciled revenue, wholesale COGS, staff payroll &amp; operating expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar className="w-3.5 h-3.5 text-violet-400 mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Export SKU P&L */}
          <button
            onClick={handleDownloadProductPnL}
            disabled={isExportingProductPnL}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-label font-medium text-slate-200 transition-all disabled:opacity-50"
            type="button"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            <span>{isExportingProductPnL ? 'Exporting...' : 'SKU P&L'}</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-label font-medium text-slate-200 transition-all disabled:opacity-50"
            type="button"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExporting ? 'Exporting...' : 'Monthly Excel'}</span>
          </button>

          {/* Record Expense CTA */}
          <button
            onClick={() => {
              setEditingExpenseId(null);
              setExpenseName('');
              setExpenseAmount(0);
              setExpenseCategory('office');
              setIsRecurring(false);
              setAddExpenseModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
            type="button"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* 2. 6 KPI Cards Grid (From Stitch P&L Specification) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Revenue */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-violet-500">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">Total Revenue</span>
          <div className="text-lg font-headline font-bold text-white mt-1 tabular-nums">
            {pnlLoading ? '—' : formatBDT(totalRev)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-body truncate">{pnl?.orders_count || 0} orders</p>
        </div>

        {/* COGS */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-slate-500">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">Wholesale COGS</span>
          <div className="text-lg font-headline font-bold text-slate-300 mt-1 tabular-nums">
            {pnlLoading ? '—' : formatBDT(cogsVal)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-body truncate">Direct inventory cost</p>
        </div>

        {/* Gross Profit */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-violet-400">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">Gross Profit</span>
          <div className="text-lg font-headline font-bold text-violet-300 mt-1 tabular-nums">
            {pnlLoading ? '—' : formatBDT(grossVal)}
          </div>
          <p className="text-[10px] text-emerald-400 mt-0.5 font-label">{grossMarginPct}% margin</p>
        </div>

        {/* OpEx */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-amber-500">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">OpEx Overhead</span>
          <div className="text-lg font-headline font-bold text-amber-300 mt-1 tabular-nums">
            {pnlLoading ? '—' : formatBDT(opCosts)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-body truncate">Rent, ads & bills</p>
        </div>

        {/* Payroll */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-pink-500">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">Staff Payroll</span>
          <div className="text-lg font-headline font-bold text-pink-300 mt-1 tabular-nums">
            {pnlLoading ? '—' : formatBDT(salariesCost)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-body truncate">Monthly wages</p>
        </div>

        {/* Net Profit */}
        <div className="glass-card p-3.5 relative overflow-hidden border-l-2 border-l-emerald-500">
          <span className="text-[10px] font-label uppercase tracking-wider text-slate-400 font-semibold block">Net Profit</span>
          <div className={`text-lg font-headline font-bold mt-1 tabular-nums ${netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pnlLoading ? '—' : formatBDT(netVal)}
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-0.5 font-label">{netMarginPct}% net margin</p>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="glass-card p-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            SKU Level Margins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-medium transition-all ${
              activeTab === 'bills'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Bills &amp; Expenses Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-medium transition-all ${
              activeTab === 'ledger'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Income Waterfall
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          Period: {selectedMonth}
        </div>
      </div>

      {/* 4. Tab Content */}
      <div className="glass-card overflow-hidden p-5">
        {activeTab === 'bills' ? (
          /* Operational Expenses Table */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-headline font-bold text-sm text-white">Monthly Expense Records</h3>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter bills..."
                className="glass-input px-3 py-1.5 text-xs w-48"
              />
            </div>

            {billsLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading expense ledger...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No expenses recorded for {selectedMonth}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[11px]">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Title</th>
                      <th className="py-3 px-3 font-semibold">Category</th>
                      <th className="py-3 px-3 font-semibold">Type</th>
                      <th className="py-3 px-3 font-semibold">Date</th>
                      <th className="py-3 px-3.5 text-right font-semibold">Amount</th>
                      <th className="py-3 px-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredExpenses.map((bill) => (
                      <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 px-3.5 font-semibold text-white">{bill.name}</td>
                        <td className="py-3 px-3 capitalize text-slate-400">{bill.category.replace('_', ' ')}</td>
                        <td className="py-3 px-3">
                          {bill.is_recurring ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-label text-[10px]">
                              Monthly Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 font-label text-[10px]">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{formatDate(bill.date)}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-white">{formatBDT(bill.amount)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpenseId(bill.id);
                                setExpenseName(bill.name);
                                setExpenseAmount(bill.amount);
                                setExpenseDate(bill.date);
                                setExpenseCategory(bill.category);
                                setIsRecurring(bill.is_recurring);
                                setAddExpenseModalOpen(true);
                              }}
                              className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete expense "${bill.name}"?`)) {
                                  deleteExpenseMutation.mutate(bill.id);
                                }
                              }}
                              className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'ledger' ? (
          /* Full Waterfall Income Statement */
          <div className="space-y-3 max-w-2xl mx-auto py-2">
            <h3 className="font-headline font-bold text-sm text-white mb-4">Financial Statement Waterfall</h3>
            <div className="divide-y divide-white/[0.06] text-xs">
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-white">1. Total Revenue</span>
                <span className="font-mono font-bold text-white tabular-nums">{formatBDT(totalRev)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
                <span>less: Cost of Goods Sold (COGS)</span>
                <span className="font-mono tabular-nums text-slate-300">- {formatBDT(cogsVal)}</span>
              </div>
              <div className="py-3 flex justify-between items-center font-bold text-violet-300 bg-white/[0.03] px-3.5 rounded-xl border border-white/[0.05]">
                <span>= Gross Profit</span>
                <span className="font-mono tabular-nums">{formatBDT(grossVal)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
                <span>less: Operating Expenses (Rent, Bills, Marketing)</span>
                <span className="font-mono tabular-nums text-slate-300">- {formatBDT(opCosts)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-slate-400 pl-4">
                <span>less: Staff Payroll</span>
                <span className="font-mono tabular-nums text-slate-300">- {formatBDT(salariesCost)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-rose-400 pl-4">
                <span>less: Courier RTO Freight Losses</span>
                <span className="font-mono tabular-nums text-rose-300">- {formatBDT(returnLoss)}</span>
              </div>
              <div className="py-3.5 flex justify-between items-center font-bold text-sm bg-white/[0.06] px-4 rounded-xl border border-white/10 mt-2">
                <span className={netVal >= 0 ? 'text-emerald-400 font-headline' : 'text-rose-400 font-headline'}>
                  = Net Operating Profit
                </span>
                <span className={`font-mono text-base tabular-nums ${netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatBDT(netVal)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* SKU Level Margin Table */
          <div className="overflow-x-auto">
            {productPnlLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading SKU-level margins...</div>
            ) : skuBreakdowns.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No SKU sales recorded for this period.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 uppercase font-label text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">SKU / Product</th>
                    <th className="py-3 px-2 text-right font-semibold">Stock</th>
                    <th className="py-3 px-2 text-right font-semibold">Units Sold</th>
                    <th className="py-3 px-3 text-right font-semibold">Wholesale / Retail</th>
                    <th className="py-3 px-3 text-right font-semibold">Revenue</th>
                    <th className="py-3 px-3 text-right font-semibold">COGS</th>
                    <th className="py-3 px-3 text-right font-semibold">Gross Profit</th>
                    <th className="py-3 px-3.5 text-right font-semibold">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {skuBreakdowns.map((row) => (
                    <tr key={row.productId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-white block">{row.productName}</span>
                        <span className="text-[10px] text-violet-300 font-mono">{row.sku || 'No SKU'}</span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-400">{row.currentStock}</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold text-white">{row.totalUnitsSold}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                        {formatBDT(row.buyPrice)} / {formatBDT(row.sellPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">{formatBDT(row.totalRevenue)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">{formatBDT(row.totalCogs)}</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${row.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatBDT(row.grossProfit)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label text-[10px] font-semibold ${
                          row.grossProfit >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {row.marginPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        title={editingExpenseId ? 'Edit Operating Expense' : 'Record Operating Expense'}
        maxWidth="md"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <Input
            label="Expense Description"
            placeholder="e.g. Shop Rent / FB Ads / Electricity"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              label="Amount (৳)"
              placeholder="5000"
              value={expenseAmount || ''}
              onChange={(e) => setExpenseAmount(Number(e.target.value))}
              required
            />
            <Input
              type="date"
              label="Date"
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
              { value: 'office', label: 'Utilities / Internet / Office' },
              { value: 'packaging', label: 'Packaging Materials' },
              { value: 'other', label: 'Other Miscellaneous' },
            ]}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_recurring_checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-white/[0.04] border-white/20 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="is_recurring_checkbox" className="text-xs text-slate-300 cursor-pointer font-body">
              Auto-generate monthly recurring expense
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
              isLoading={addExpenseMutation.isPending || updateExpenseMutation.isPending}
            >
              {editingExpenseId ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
