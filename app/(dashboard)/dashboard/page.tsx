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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.full_name || 'Merchant'} 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Store: <span className="text-slate-200 font-semibold">{user?.business_name}</span> • Here is your store&apos;s real-time performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/orders/new">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="outline" size="md">
              <Boxes className="w-4 h-4" />
              <span>Manage Stock</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300">
                Low Stock Alert:
              </span>{' '}
              {lowStockItems.length} product(s) reached or fell below reorder threshold.
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
          title="Monthly Revenue"
          value={pnlLoading ? '...' : formatBDT(pnl?.total_revenue || 0)}
          subtitle={`${pnl?.orders_count || 0} delivered / confirmed orders`}
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
          icon={<Package className="w-4 h-4 text-indigo-400" />}
        />

        {/* Net Profit */}
        <StatCard
          title="Net Profit"
          value={pnlLoading ? '...' : formatBDT(pnl?.net_profit || 0)}
          subtitle={
            isOwner
              ? `Margin: ${pnl?.net_margin_percent?.toFixed(1) || 0}% after expenses`
              : 'Owner view restricted'
          }
          icon={<ArrowUpRight className="w-4 h-4 text-sky-400" />}
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Expense & Loss Breakdown (Current Month)
            </h3>
            <Link
              href="/accounts"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Full P&L Report →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Cost of Goods (COGS)</span>
              <span className="text-sm font-bold text-slate-200">
                {formatBDT(pnl?.cogs || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Operational Costs</span>
              <span className="text-sm font-bold text-slate-200">
                {formatBDT(pnl?.operational_costs || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Salaries / Payroll</span>
              <span className="text-sm font-bold text-slate-200">
                {formatBDT(pnl?.salaries_cost || 0)}
              </span>
            </div>

            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/40">
              <span className="text-[11px] text-rose-400 block mb-1">Courier Return Losses</span>
              <span className="text-sm font-bold text-rose-300">
                {formatBDT(pnl?.return_costs || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Orders
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates of customer purchases
            </p>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm">
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
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
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
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">
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
                    <td className="py-3 px-4 font-bold text-white">
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
                        className="text-emerald-400 hover:text-emerald-300 font-medium"
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
