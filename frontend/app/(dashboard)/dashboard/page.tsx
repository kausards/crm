'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  Package,
  RotateCcw,
  CheckCircle,
  Truck,
  Plus,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useAuth } from '@/app/providers';
import { StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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

interface OrderItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  is_flagged: boolean;
  courier_provider: string | null;
  created_at: string;
}

interface ProductItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  buy_price: number;
  sell_price: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  // 1. Fetch PnL for current month (Owner only)
  const { data: pnl, isLoading: pnlLoading } = useQuery<PnLData>({
    queryKey: ['dashboard-pnl'],
    queryFn: () => fetchApi('/api/v1/accounts/pnl'),
    enabled: isOwner,
  });

  // 2. Fetch Recent Orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{
    items: OrderItem[];
    pagination: { total: number };
  }>({
    queryKey: ['dashboard-orders'],
    queryFn: () => fetchApi('/api/v1/orders?limit=6'),
  });

  // 3. Fetch Products for Low Stock Alert
  const { data: productsData } = useQuery<{ items: ProductItem[] } | ProductItem[]>({
    queryKey: ['dashboard-products'],
    queryFn: () => fetchApi('/api/v1/products?limit=100'),
  });

  const productList: ProductItem[] = Array.isArray(productsData)
    ? productsData
    : productsData?.items || [];

  const lowStockItems = productList.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  );

  const recentOrders: OrderItem[] = Array.isArray(ordersData)
    ? ordersData
    : ordersData?.items || [];
  const pendingOrdersCount = recentOrders.filter(
    (o) => o.status === 'pending' || o.status === 'flagged'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-[#15121A] p-6 md:p-8 border border-white/[0.08] shadow-glow-card">
        {/* Glow Halos */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-brand-magenta/15 blur-[90px] pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-brand-violet/15 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Real-time Sync Active
              </span>
              <span className="text-xs text-slate-400 font-medium">Auto-synced</span>
            </div>
            <h2 className="font-sora text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Good day, {user?.full_name || 'Merchant'} 👋
            </h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Store: <strong className="text-white font-semibold">{user?.business_name}</strong> • Here is your inventory throughput and multi-branch revenue matrix.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/orders/new">
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary" size="md">
                <Boxes className="w-4 h-4 text-purple-400" />
                <span>Quick Stock In</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <span className="font-semibold text-amber-300">
                Low Stock Warning:
              </span>{' '}
              {lowStockItems.length} product(s) reached or fell below minimum threshold.
            </div>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-4 ml-4 shrink-0"
          >
            Review Inventory →
          </Link>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <StatCard
          title="Today / Month Revenue"
          value={pnlLoading ? '...' : formatBDT(pnl?.total_revenue || 0)}
          subtitle={`${pnl?.orders_count || 0} orders delivered / completed`}
          trend={{ value: '18.4%', isPositive: true }}
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />

        {/* Gross Profit */}
        <StatCard
          title="Gross Profit"
          value={pnlLoading ? '...' : formatBDT(pnl?.gross_profit || 0)}
          subtitle={
            isOwner
              ? `Margin: ${pnl?.gross_margin_percent?.toFixed(1) || 0}% after COGS`
              : 'Owner view restricted'
          }
          trend={{ value: '12.6%', isPositive: true }}
          icon={<Package className="w-4 h-4 text-purple-400" />}
        />

        {/* Net Profit */}
        <StatCard
          title="Net Profit"
          value={pnlLoading ? '...' : formatBDT(pnl?.net_profit || 0)}
          subtitle={
            isOwner
              ? `Margin: ${pnl?.net_margin_percent?.toFixed(1) || 0}% after OpEx & Courier`
              : 'Owner view restricted'
          }
          trend={{ value: '8.2%', isPositive: true }}
          icon={<ArrowUpRight className="w-4 h-4 text-brand-magenta" />}
        />

        {/* Actionable Orders */}
        <StatCard
          title="Pending Action"
          value={ordersLoading ? '...' : pendingOrdersCount}
          subtitle="Orders waiting for courier dispatch"
          icon={<ShoppingCart className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {/* Secondary Performance Drill-down (Owner Only) */}
      {isOwner && (
        <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-glow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-sora text-sm font-bold text-white tracking-tight uppercase">
                Expense & Loss Breakdown (Current Month)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic cost structure calculated in real time
              </p>
            </div>
            <Link
              href="/accounts"
              className="text-xs text-brand-magenta hover:text-pink-300 font-semibold flex items-center gap-1"
            >
              <span>Full P&L Report</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#100D15] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Cost of Goods (COGS)</span>
              <span className="font-sora text-sm md:text-base font-bold text-white tabular-nums">
                {formatBDT(pnl?.cogs || 0)}
              </span>
            </div>

            <div className="p-3.5 bg-[#100D15] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Operational Costs</span>
              <span className="font-sora text-sm md:text-base font-bold text-white tabular-nums">
                {formatBDT(pnl?.operational_costs || 0)}
              </span>
            </div>

            <div className="p-3.5 bg-[#100D15] rounded-xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Salaries / Payroll</span>
              <span className="font-sora text-sm md:text-base font-bold text-white tabular-nums">
                {formatBDT(pnl?.salaries_cost || 0)}
              </span>
            </div>

            <div className="p-3.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span className="text-[11px] text-rose-300 block mb-1 font-medium">Courier Return Losses</span>
              <span className="font-sora text-sm md:text-base font-bold text-rose-400 tabular-nums">
                {formatBDT(pnl?.return_costs || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="bg-[#15121A] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-glow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-sora text-base font-bold text-white tracking-tight">
              Recent Orders
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates of customer purchases
            </p>
          </div>
          <Link href="/orders">
            <Button variant="secondary" size="sm">
              View All Orders ({ordersData?.pagination?.total || 0})
            </Button>
          </Link>
        </div>

        {ordersLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading recent orders...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No orders created yet.</p>
            <Link href="/orders/new" className="inline-block mt-3">
              <Button size="sm">Create First Order</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#100D15] border-b border-white/[0.08] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-purple-300">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {order.customer_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.customer_phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sora font-bold text-white tabular-nums">
                      {formatBDT(order.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400 capitalize">
                      {order.courier_provider || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/orders?id=${order.id}`}
                        className="text-brand-magenta hover:text-pink-300 font-semibold"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

