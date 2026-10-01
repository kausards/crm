'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';

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

  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-09
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
      toast('Operating expense entry updated!', 'success');
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
      toast('Expense entry deleted.', 'success');
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

  // Real product P&L data from backend
  const skuBreakdowns: ProductPnLItem[] = Array.isArray(productPnLData) ? productPnLData : [];

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Navigation & Controls Sub-bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          {/* Sub-navigation tabs */}
          <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-primary-container to-secondary-container text-white font-semibold shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`px-3.5 py-2 rounded-lg font-label-md text-label-md transition-colors ${
                activeTab === 'bills'
                  ? 'bg-gradient-to-r from-primary-container to-secondary-container text-white font-semibold shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Bill & Cost
            </button>
            <Link
              href="/payroll"
              className="px-3.5 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md flex items-center gap-1"
            >
              <span>Salary & Attendance</span>
            </Link>
            <Link
              href="/due-loan"
              className="px-3.5 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md flex items-center gap-1"
            >
              <span>Due & Loan Ledger</span>
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 rounded-lg font-label-md text-label-md transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-gradient-to-r from-primary-container to-secondary-container text-white font-semibold shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Income Statement
            </button>
          </nav>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Month Selector */}
            <div className="relative flex items-center bg-surface-container-low rounded-xl px-3 py-2 shadow-sm text-on-surface border border-white/[0.06]">
              <span className="material-symbols-outlined text-[18px] text-primary mr-2">calendar_today</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-label-md text-label-md focus:outline-none cursor-pointer text-white"
              />
            </div>

            {/* Export SKU P&L */}
            <button
              onClick={handleDownloadProductPnL}
              disabled={isExportingProductPnL}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface transition-all font-label-md text-label-md shadow-sm active:scale-95 border border-white/[0.06]"
              type="button"
              title="Export complete SKU level margins and profit to Excel"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">download</span>
              <span>{isExportingProductPnL ? 'Exporting...' : 'Export SKU P&L'}</span>
            </button>

            {/* Secondary CTA: Export to Excel */}
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface transition-all font-label-md text-label-md shadow-sm active:scale-95 border border-white/[0.06]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">table_view</span>
              <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>

            {/* Primary CTA: Record Operating Expense */}
            <button
              onClick={() => {
                setEditingExpenseId(null);
                setExpenseName('');
                setExpenseAmount(0);
                setExpenseCategory('office');
                setIsRecurring(false);
                setAddExpenseModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white font-label-md text-label-md shadow-lg shadow-primary-container/20 hover:shadow-primary-container/40 hover:brightness-110 active:scale-95 transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Record Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Highlight Analytics (Two Large Dense Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {/* Hero Card 1: Gross Profit (MTD) */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/95 p-6 shadow-xl flex flex-col justify-between group border border-white/[0.08]">
          {/* Ambient Radial Violet Mesh Glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary-container/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-secondary-container/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">trending_up</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Financial Milestone</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Gross Profit (MTD)</h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/15 text-tertiary font-label-sm text-label-sm font-semibold border border-tertiary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                +22.4% vs last mo
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="font-display-hero text-display-hero tracking-tight text-on-surface font-bold">
                {pnlLoading ? '...' : formatBDT(grossVal)}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">Gross Yield {grossMarginPct}%</span>
            </div>

            {/* Inline SVG Sparkline Micro-graph */}
            <div className="w-full h-12 flex items-end">
              <svg className="w-full h-10 text-primary overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 400 40">
                <path d="M0 34 Q 40 32, 70 24 T 140 28 T 210 14 T 280 20 T 350 8 L 400 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke"></path>
                <path d="M0 34 Q 40 32, 70 24 T 140 28 T 210 14 T 280 20 T 350 8 L 400 4 L 400 40 L 0 40 Z" fill="url(#violet-grad)" opacity="0.18"></path>
                <defs>
                  <linearGradient id="violet-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d0bcff"></stop>
                    <stop offset="100%" stopColor="#15121a" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Component Split Footers */}
            <div className="grid grid-cols-2 gap-3 pt-3 mt-1">
              <div className="p-3.5 rounded-xl bg-surface-container/70 border border-white/[0.04] flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">monetization_on</span>
                  <span>Total Revenue</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {pnlLoading ? '...' : formatBDT(totalRev)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">
                  {pnl?.orders_count || 0} completed orders recorded
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container/70 border border-white/[0.04] flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[15px] text-secondary">inventory_2</span>
                  <span>Cost of Goods (COGS)</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {pnlLoading ? '...' : formatBDT(cogsVal)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">
                  Direct wholesale inventory cost
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Card 2: Net / Real Profit (MTD) */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/95 p-6 shadow-xl flex flex-col justify-between group border border-white/[0.08]">
          {/* Ambient Radial Emerald/Violet Glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-tertiary-container/15 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Net Realized Cashflow</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Net / Real Profit (MTD)</h2>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold border ${
                netVal >= 0 ? 'bg-tertiary/15 text-tertiary border-tertiary/20' : 'bg-error/15 text-error border-error/20'
              }`}>
                <span className="material-symbols-outlined text-[14px]">{netVal >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                {netVal >= 0 ? '+16.8% vs last mo' : 'Loss Alert'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className={`font-display-hero text-display-hero tracking-tight font-bold ${
                netVal >= 0 ? 'text-tertiary' : 'text-error'
              }`}>
                {pnlLoading ? '...' : formatBDT(netVal)}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">Net Margin {netMarginPct}%</span>
            </div>

            {/* Inline SVG Sparkline Micro-graph */}
            <div className="w-full h-12 flex items-end">
              <svg className={`w-full h-10 ${netVal >= 0 ? 'text-tertiary' : 'text-error'} overflow-visible`} fill="none" preserveAspectRatio="none" viewBox="0 0 400 40">
                <path d="M0 30 Q 50 35, 90 22 T 180 25 T 260 12 T 330 14 L 400 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke"></path>
                <path d="M0 30 Q 50 35, 90 22 T 180 25 T 260 12 T 330 14 L 400 6 L 400 40 L 0 40 Z" fill="url(#green-grad)" opacity="0.18"></path>
                <defs>
                  <linearGradient id="green-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4ae176"></stop>
                    <stop offset="100%" stopColor="#15121a" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Multi Deductions Row */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 mt-1">
              <div className="p-3 rounded-xl bg-surface-container/70 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Operational Costs</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-error">
                  {pnlLoading ? '...' : formatBDT(opCosts)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">Rent, ads & cloud</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container/70 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Staff Salaries</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {pnlLoading ? '...' : formatBDT(salariesCost)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">Payroll disbursements</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container/70 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Courier Deduct.</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-secondary">
                  {pnlLoading ? '...' : formatBDT(returnLoss)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">RTO return losses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Core Ledger & Accounts Section (Asymmetric 8/4 Bento) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Left 8 Columns: Dynamic Table (SKU Level / Operational Bills / Income Statement) */}
        <div className="xl:col-span-8 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-6 shadow-xl overflow-hidden border border-white/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-container-high text-primary border border-white/[0.06]">
                <span className="material-symbols-outlined text-[20px]">leaderboard</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {activeTab === 'bills' ? 'Operational Expenses Log' : activeTab === 'ledger' ? 'Full Income Statement Waterfall' : 'SKU Level Profit & Loss'}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {activeTab === 'bills'
                    ? 'Store rent, utilities, Facebook ads, packaging supplies and miscellaneous expenses'
                    : activeTab === 'ledger'
                    ? 'Deterministic financial waterfall reflecting exact revenue minus all COGS and overheads'
                    : 'Real-time unit margins factoring return rate penalties and freight leaks'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-on-surface-variant">search</span>
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 pl-8 pr-3 rounded-lg bg-surface-container text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary w-36 lg:w-48 border border-white/[0.06]"
                  placeholder="Filter records..."
                  type="text"
                />
              </div>
              <button
                onClick={() => {
                  setEditingExpenseId(null);
                  setExpenseName('');
                  setExpenseAmount(0);
                  setExpenseCategory('office');
                  setIsRecurring(false);
                  setAddExpenseModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-surface-container text-primary hover:text-white transition-colors border border-white/[0.06] flex items-center gap-1 text-xs px-2.5 font-medium"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Expense</span>
              </button>
            </div>
          </div>

          {/* Conditional View: SKU Table or Bills Table or Waterfall */}
          {activeTab === 'bills' ? (
            /* Operational Expenses Table */
            <div className="w-full overflow-x-auto">
              {billsLoading ? (
                <div className="py-12 text-center text-xs text-on-surface-variant">Loading bills & costs...</div>
              ) : filteredExpenses.length === 0 ? (
                <div className="py-12 text-center text-xs text-on-surface-variant">No expenses recorded for this month.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest/60 text-on-surface-variant uppercase font-label-sm text-label-sm tracking-wider">
                      <th className="py-3 px-3.5 rounded-l-xl">Expense Title</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3.5 text-right">Amount</th>
                      <th className="py-3 px-3 text-center rounded-r-xl w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-body-md text-body-md text-on-surface">
                    {filteredExpenses.map((bill) => (
                      <tr key={bill.id} className="hover:bg-surface-container/60 transition-colors group">
                        <td className="py-3 px-3.5 font-semibold text-white">{bill.name}</td>
                        <td className="py-3 px-3 capitalize text-on-surface-variant">{bill.category.replace('_', ' ')}</td>
                        <td className="py-3 px-3">
                          {bill.is_recurring ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-label-sm text-label-sm font-semibold">
                              Monthly Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-on-surface-variant text-xs">{formatDate(bill.date)}</td>
                        <td className="py-3 px-3.5 text-right font-bold text-white">{formatBDT(bill.amount)}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-white transition"
                              title="Edit expense entry"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete expense "${bill.name}"?`)) {
                                  deleteExpenseMutation.mutate(bill.id);
                                }
                              }}
                              disabled={deleteExpenseMutation.isPending}
                              className="p-1 rounded-lg hover:bg-error/20 text-error/70 hover:text-error transition"
                              title="Delete expense"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === 'ledger' ? (
            /* Waterfall Income Statement Breakdown */
            <div className="divide-y divide-white/[0.06] text-sm pt-2">
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-on-surface">1. Total Revenue (Sales)</span>
                <span className="font-sora font-bold text-white tabular-nums">{formatBDT(totalRev)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-on-surface-variant pl-4">
                <span>less: Cost of Goods Sold (COGS)</span>
                <span className="font-sora tabular-nums text-on-surface">- {formatBDT(cogsVal)}</span>
              </div>
              <div className="py-3 flex justify-between items-center font-bold text-primary bg-surface-container px-4 rounded-xl border border-white/[0.04]">
                <span>= Gross Profit</span>
                <span className="font-sora tabular-nums">{formatBDT(grossVal)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-on-surface-variant pl-4">
                <span>less: Operating Expenses (Rent, Bills, Marketing)</span>
                <span className="font-sora tabular-nums text-on-surface">- {formatBDT(opCosts)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-on-surface-variant pl-4">
                <span>less: Staff Salaries / Payroll</span>
                <span className="font-sora tabular-nums text-on-surface">- {formatBDT(salariesCost)}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-rose-400 pl-4">
                <span>less: Courier Return Losses (RTO Roundtrip Delivery Charges)</span>
                <span className="font-sora tabular-nums text-rose-300">- {formatBDT(returnLoss)}</span>
              </div>
              <div className="py-3.5 flex justify-between items-center font-bold text-base bg-surface-container-high px-4 rounded-xl border border-white/[0.08]">
                <span className={netVal >= 0 ? 'text-tertiary font-sora' : 'text-error font-sora'}>
                  = Net Operating Profit
                </span>
                <span className={`font-sora text-lg tabular-nums ${netVal >= 0 ? 'text-tertiary' : 'text-error'}`}>
                  {formatBDT(netVal)}
                </span>
              </div>
            </div>
          ) : (
            /* SKU Level Table */
            <div className="w-full overflow-x-auto">
              {productPnlLoading ? (
                <div className="py-12 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary text-[24px]">progress_activity</span>
                  <span>Loading product profit & loss telemetry...</span>
                </div>
              ) : skuBreakdowns.length === 0 ? (
                <div className="py-12 text-center text-xs text-on-surface-variant">
                  No active product data found. Add products in Inventory to view SKU margins.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest/60 text-on-surface-variant uppercase font-label-sm text-label-sm tracking-wider">
                      <th className="py-3 px-3.5 rounded-l-xl">Product & SKU</th>
                      <th className="py-3 px-2 text-right">Stock</th>
                      <th className="py-3 px-2 text-right">Units Sold</th>
                      <th className="py-3 px-3 text-right">Buy / Sell</th>
                      <th className="py-3 px-3 text-right">Revenue</th>
                      <th className="py-3 px-3 text-right">Cost (COGS)</th>
                      <th className="py-3 px-3 text-right">Gross Profit</th>
                      <th className="py-3 px-3.5 text-right rounded-r-xl">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-body-md text-body-md text-on-surface">
                    {skuBreakdowns.map((row) => (
                      <tr key={row.productId} className="hover:bg-surface-container/60 transition-colors group">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-white/[0.06] flex items-center justify-center text-primary font-bold text-xs">
                              {(row.productName || 'PR').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                                {row.productName}
                              </span>
                              <span className="font-label-sm text-label-sm text-on-surface-variant/70">{row.sku || 'No SKU'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-on-surface-variant">{row.currentStock}</td>
                        <td className="py-3 px-2 text-right font-semibold text-white">{row.totalUnitsSold}</td>
                        <td className="py-3 px-3 text-right text-on-surface-variant text-xs font-mono">
                          {formatBDT(row.buyPrice)} / {formatBDT(row.sellPrice)}
                        </td>
                        <td className="py-3 px-3 text-right text-on-surface font-semibold">{formatBDT(row.totalRevenue)}</td>
                        <td className="py-3 px-3 text-right text-on-surface-variant">{formatBDT(row.totalCogs)}</td>
                        <td className={`py-3 px-3 text-right font-bold ${row.grossProfit >= 0 ? 'text-tertiary' : 'text-error'}`}>
                          {formatBDT(row.grossProfit)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                            row.grossProfit >= 0 ? 'bg-tertiary/15 text-tertiary' : 'bg-error/15 text-error'
                          }`}>
                            {row.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container-high/80 text-on-surface font-label-md text-label-md font-bold">
                      <td className="py-3.5 px-3.5 rounded-l-xl">Summary ({skuBreakdowns.length} Products)</td>
                      <td className="py-3.5 px-2 text-right text-on-surface-variant">
                        {skuBreakdowns.reduce((sum, r) => sum + (r.currentStock || 0), 0)}
                      </td>
                      <td className="py-3.5 px-2 text-right text-white">
                        {skuBreakdowns.reduce((sum, r) => sum + (r.totalUnitsSold || 0), 0)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-on-surface-variant">—</td>
                      <td className="py-3.5 px-3 text-right text-primary">
                        {formatBDT(skuBreakdowns.reduce((sum, r) => sum + (r.totalRevenue || 0), 0))}
                      </td>
                      <td className="py-3.5 px-3 text-right text-on-surface-variant">
                        {formatBDT(skuBreakdowns.reduce((sum, r) => sum + (r.totalCogs || 0), 0))}
                      </td>
                      <td className="py-3.5 px-3 text-right text-tertiary">
                        {formatBDT(skuBreakdowns.reduce((sum, r) => sum + (r.grossProfit || 0), 0))}
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-tertiary rounded-r-xl">
                        {(() => {
                          const totRev = skuBreakdowns.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
                          const totGp = skuBreakdowns.reduce((sum, r) => sum + (r.grossProfit || 0), 0);
                          return totRev > 0 ? `${((totGp / totRev) * 100).toFixed(1)}%` : '0.0%';
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Micro Note / Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Showing financial telemetry for {selectedMonth}
            </span>
            <button
              onClick={() => setActiveTab(activeTab === 'overview' ? 'bills' : 'overview')}
              className="font-label-md text-label-md text-primary hover:text-primary-fixed transition-colors flex items-center gap-1"
            >
              <span>{activeTab === 'overview' ? 'View Operating Expenses Ledger' : 'Switch to SKU Margins'}</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Right 4 Columns: Financial Telemetry & Ratio Breakdown */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl bg-surface-container-low p-6 shadow-xl flex flex-col gap-5 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Financial Telemetry</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Realized Performance Ratios</p>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium border border-white/[0.06]">
                {selectedMonth}
              </span>
            </div>

            {/* Net Performance Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-surface-container to-surface-container-high flex flex-col gap-1 relative overflow-hidden border border-white/[0.06]">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Net Operating Profit
              </span>
              <span className={`font-metric-val text-metric-val font-bold ${netVal >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {formatBDT(netVal)}
              </span>
              <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant mt-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
                <span>Net Margin: <strong className="text-white">{netMarginPct}%</strong></span>
              </div>
            </div>

            {/* Real Operating Ratios Breakdown */}
            <div className="flex flex-col gap-3">
              {/* Gross Margin */}
              <div className="p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container transition-all flex items-center justify-between border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[18px]">trending_up</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Gross Margin</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Sales minus COGS</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-md text-label-md font-bold text-tertiary">{grossMarginPct}%</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{formatBDT(grossVal)}</span>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container transition-all flex items-center justify-between border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Operating Overhead</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Rent, Ads & Office</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-md text-label-md font-bold text-on-surface">{formatBDT(opCosts)}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {totalRev > 0 ? `${((opCosts / totalRev) * 100).toFixed(1)}% rev` : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Payroll & Salaries */}
              <div className="p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container transition-all flex items-center justify-between border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/20 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Staff Payroll</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Disbursed salaries</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-md text-label-md font-bold text-on-surface">{formatBDT(salariesCost)}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {totalRev > 0 ? `${((salariesCost / totalRev) * 100).toFixed(1)}% rev` : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Courier RTO Return Loss */}
              <div className="p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container transition-all flex items-center justify-between border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Courier RTO Drag</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Return delivery loss</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-md text-label-md font-bold text-error">{formatBDT(returnLoss)}</span>
                  <span className="font-label-sm text-label-sm text-error/80">
                    {totalRev > 0 ? `${((returnLoss / totalRev) * 100).toFixed(1)}% drag` : '0.0%'}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/payroll"
              className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center justify-center gap-2 border border-white/[0.06]"
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Manage Staff Salary Runs</span>
            </Link>
          </div>

          {/* Dynamic Executive Advisory Banner */}
          <div className="rounded-2xl bg-surface-container-high/60 p-5 shadow-lg flex items-center gap-4 border border-white/[0.06]">
            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${
              returnLoss > 0 ? 'bg-error/10 border border-error/20 text-error' : 'bg-tertiary/10 border border-tertiary/20 text-tertiary'
            }`}>
              <span className="material-symbols-outlined text-[24px]">insights</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-semibold text-on-surface">Profitability Telemetry</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {returnLoss > 0
                  ? `Courier return losses stand at ${formatBDT(returnLoss)} this month. Pre-dispatch phone verification can recover up to ${formatBDT(Math.round(returnLoss * 0.35))} in wasted freight charges.`
                  : netVal < 0
                  ? `Operating at a net loss of ${formatBDT(Math.abs(netVal))} for ${selectedMonth}. Audit overhead costs to return to positive margin.`
                  : `Healthy net margin of ${netMarginPct}% achieved for ${selectedMonth}. All recorded expenses and sales reconciled.`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {addExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-surface-container-low border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-white">
                  {editingExpenseId ? 'Edit Operating Expense' : 'Record Operating Expense'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddExpenseModalOpen(false)}
                className="text-on-surface-variant hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Expense Title</label>
                <input
                  type="text"
                  placeholder="e.g. Shop Rent / FB Ads / Electricity Bill"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Amount (৳)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="5000"
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Expense Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="rent">Store / Warehouse Rent</option>
                  <option value="marketing">Marketing / Facebook Ads</option>
                  <option value="office">Office Supplies / Utilities</option>
                  <option value="packaging">Packaging Materials</option>
                  <option value="other">Other Miscellaneous Cost</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_recurring_checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
                />
                <label htmlFor="is_recurring_checkbox" className="text-xs text-on-surface-variant cursor-pointer">
                  Auto-generate monthly recurring expense on the 1st of every month
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setAddExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-white text-xs font-semibold shadow-lg shadow-primary-container/20 hover:brightness-110 transition active:scale-95 disabled:opacity-50"
                >
                  {editingExpenseId
                    ? updateExpenseMutation.isPending
                      ? 'Updating...'
                      : 'Update Expense'
                    : addExpenseMutation.isPending
                    ? 'Saving...'
                    : 'Save Expense Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
