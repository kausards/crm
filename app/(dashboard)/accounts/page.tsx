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
import { Input as FormInput, Select } from '@/components/ui/Input';

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
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts & P&L</h1>
          <p className="text-sm text-muted-foreground mt-1">Financial overview, expenses, and profit margins.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center bg-background border rounded-md px-3 py-1.5 text-sm h-9">
            <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProductPnL}
            disabled={isExportingProductPnL}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExportingProductPnL ? 'Exporting...' : 'Product P&L'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            disabled={isExporting}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingExpenseId(null);
              setExpenseName('');
              setExpenseAmount(0);
              setExpenseCategory('office');
              setIsRecurring(false);
              setAddExpenseModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* 2. 6 KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="text-xl font-bold tabular-nums">
              {pnlLoading ? '—' : formatBDT(totalRev)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{pnl?.orders_count || 0} orders</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cost of Goods</CardTitle>
            <div className="text-xl font-bold tabular-nums">
              {pnlLoading ? '—' : formatBDT(cogsVal)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Purchase cost</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gross Profit</CardTitle>
            <div className="text-xl font-bold text-primary tabular-nums">
              {pnlLoading ? '—' : formatBDT(grossVal)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">{grossMarginPct}% margin</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Operating Cost</CardTitle>
            <div className="text-xl font-bold tabular-nums">
              {pnlLoading ? '—' : formatBDT(opCosts)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Bills & expenses</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Staff Payroll</CardTitle>
            <div className="text-xl font-bold tabular-nums">
              {pnlLoading ? '—' : formatBDT(salariesCost)}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Monthly wages</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col space-y-1 p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
            <div className={`text-xl font-bold tabular-nums ${netVal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {pnlLoading ? '—' : formatBDT(netVal)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">{netMarginPct}% net margin</p>
          </CardHeader>
        </Card>
      </div>

      {/* 3. Main Content Container */}
      <Card className="flex flex-col overflow-hidden">
        {/* Tabs inside CardHeader */}
        <CardHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setActiveTab('overview')}
              >
                Product Margins
              </Button>
              <Button
                variant={activeTab === 'bills' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setActiveTab('bills')}
              >
                Expenses
              </Button>
              <Button
                variant={activeTab === 'ledger' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setActiveTab('ledger')}
              >
                Income Breakdown
              </Button>
            </div>
            <div className="text-xs text-muted-foreground font-medium hidden sm:block">
              Period: {selectedMonth}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeTab === 'bills' ? (
            /* Operational Expenses */
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 sm:px-6">
                <h3 className="font-semibold text-sm">Monthly Expense Records</h3>
                <Input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter bills..."
                  className="w-48 h-8"
                />
              </div>

              {billsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading expense ledger...</div>
              ) : filteredExpenses.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No expenses recorded for {selectedMonth}.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.name}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{bill.category.replace('_', ' ')}</TableCell>
                        <TableCell>
                          {bill.is_recurring ? (
                            <Badge variant="outline" className="border-primary text-primary bg-primary/10">
                              Monthly Auto
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              One-time
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(bill.date)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatBDT(bill.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => {
                                setEditingExpenseId(bill.id);
                                setExpenseName(bill.name);
                                setExpenseAmount(bill.amount);
                                setExpenseDate(bill.date);
                                setExpenseCategory(bill.category);
                                setIsRecurring(bill.is_recurring);
                                setAddExpenseModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete expense "${bill.name}"?`)) {
                                  deleteExpenseMutation.mutate(bill.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : activeTab === 'ledger' ? (
            /* Full Waterfall Income Statement */
            <div className="p-6 max-w-2xl mx-auto w-full">
              <h3 className="font-semibold text-lg mb-6">Financial Statement Waterfall</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="font-medium">1. Total Revenue</span>
                  <span className="font-bold tabular-nums">{formatBDT(totalRev)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-muted-foreground border-b">
                  <span>less: Cost of Goods Sold (COGS)</span>
                  <span className="tabular-nums">- {formatBDT(cogsVal)}</span>
                </div>
                <div className="flex justify-between items-center py-4 font-bold text-primary bg-primary/5 px-4 rounded-lg my-2">
                  <span>= Gross Profit</span>
                  <span className="tabular-nums">{formatBDT(grossVal)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-muted-foreground border-b">
                  <span>less: Operating Expenses (Rent, Bills, Marketing)</span>
                  <span className="tabular-nums">- {formatBDT(opCosts)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-muted-foreground border-b">
                  <span>less: Staff Payroll</span>
                  <span className="tabular-nums">- {formatBDT(salariesCost)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-destructive border-b">
                  <span>less: Courier RTO Freight Losses</span>
                  <span className="tabular-nums">- {formatBDT(returnLoss)}</span>
                </div>
                <div className="flex justify-between items-center py-5 font-bold bg-muted/30 px-4 rounded-lg mt-4 border">
                  <span className={netVal >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                    = Net Operating Profit
                  </span>
                  <span className={`text-base tabular-nums ${netVal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatBDT(netVal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* SKU Level Margin Table */
            <div className="flex flex-col h-full">
              {productPnlLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading SKU-level margins...</div>
              ) : skuBreakdowns.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No SKU sales recorded for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Buy / Sell Price</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuBreakdowns.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>
                          <span className="font-medium block">{row.productName}</span>
                          <span className="text-xs text-muted-foreground">{row.sku || 'No SKU'}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{row.currentStock}</TableCell>
                        <TableCell className="text-right font-bold tabular-nums">{row.totalUnitsSold}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs tabular-nums">
                          {formatBDT(row.buyPrice)} / {formatBDT(row.sellPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatBDT(row.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatBDT(row.totalCogs)}</TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${row.grossProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {formatBDT(row.grossProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.grossProfit >= 0 ? 'outline' : 'destructive'} className={row.grossProfit >= 0 ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10' : ''}>
                            {row.marginPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Expense Modal */}
      <Modal
        isOpen={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        title={editingExpenseId ? 'Edit Operating Expense' : 'Record Operating Expense'}
        maxWidth="md"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <FormInput
            label="Expense Description"
            placeholder="e.g. Shop Rent / FB Ads / Electricity"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              type="number"
              min="1"
              label="Amount (৳)"
              placeholder="5000"
              value={expenseAmount || ''}
              onChange={(e) => setExpenseAmount(Number(e.target.value))}
              required
            />
            <FormInput
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
              className="rounded bg-background border-input text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="is_recurring_checkbox" className="text-sm text-muted-foreground cursor-pointer">
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
              disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}
            >
              {editingExpenseId ? (updateExpenseMutation.isPending ? 'Updating...' : 'Update Expense') : (addExpenseMutation.isPending ? 'Saving...' : 'Save Expense')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
