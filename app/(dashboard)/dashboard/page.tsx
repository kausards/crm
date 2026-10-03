'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Plus,
  FileDown,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  Truck,
  Zap,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useAuth } from '@/app/providers';
import { Badge } from '@/components/ui/Badge';

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

interface DashboardMetrics {
  today_sales: number;
  today_profit: number;
  today_orders_count: number;
  today_delivered_count: number;
  pending_orders_count: number;
  low_stock_count: number;
  total_pending_due: number;
  total_loan_balance: number;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  courier_provider: string | null;
  created_at: string;
  is_flagged?: boolean;
}

interface DashboardStats {
  date: string;
  metrics: DashboardMetrics;
  recent_orders: RecentOrder[];
}

interface ChartPoint {
  date: string;
  revenue: number;
  profit: number;
  orders_count: number;
}

interface ChartResponse {
  from: string;
  to: string;
  total_revenue: number;
  total_profit: number;
  total_orders: number;
  data: ChartPoint[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner =
    !user?.role ||
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    user?.role === 'admin' ||
    Boolean((user as any)?.is_super_admin);
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchApi('/api/v1/dashboard/stats'),
    refetchInterval: 60000,
  });

  const { data: pnl } = useQuery<PnLData>({
    queryKey: ['dashboard-pnl'],
    queryFn: () => fetchApi('/api/v1/accounts/pnl'),
    enabled: isOwner,
  });

  const { data: chartResponse, isLoading: chartLoading } = useQuery<ChartResponse>({
    queryKey: ['dashboard-chart', chartTimeframe],
    queryFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      let days = 30;
      if (chartTimeframe === '7D') days = 7;
      else if (chartTimeframe === '30D') days = 30;
      else if (chartTimeframe === '90D') days = 90;
      else if (chartTimeframe === 'YTD') {
        const fromYtd = `${new Date().getFullYear()}-01-01`;
        return fetchApi(`/api/v1/dashboard/chart?from=${fromYtd}&to=${today}`);
      }
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return fetchApi(`/api/v1/dashboard/chart?from=${from}&to=${today}`);
    },
  });

  const metrics = stats?.metrics;
  const recentOrders = stats?.recent_orders || [];
  const chartData = chartResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* SECTION 1: Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-xl text-white">
            Good day, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.business_name || 'Your Store'} · Here's what's happening today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/accounts"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-sm font-medium text-slate-300 transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg shadow-sm shadow-violet-600/25 active:scale-[0.97] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* SECTION 2: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Revenue
            </p>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
              <TrendingUp className="w-3 h-3" /> +18%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums">
              {statsLoading ? '—' : formatBDT(metrics?.today_sales || 0)}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {metrics?.today_orders_count || 0} orders today
            </p>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orders
            </p>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums">
              {statsLoading ? '—' : metrics?.today_orders_count || 0}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              <span className="text-emerald-400">{metrics?.today_delivered_count || 0} delivered</span>
              <span className="text-slate-600"> · </span>
              <span className="text-amber-400">{metrics?.pending_orders_count || 0} pending</span>
            </p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gross Profit (30d)
            </p>
            {pnl && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
                {pnl.gross_margin_percent?.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums">
              {isOwner ? (pnl ? formatBDT(pnl.gross_profit) : '—') : 'N/A'}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {pnl ? `Net: ${formatBDT(pnl.net_profit)}` : 'Finance access required'}
            </p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="glass-card p-5 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Low Stock
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                (metrics?.low_stock_count || 0) > 0
                  ? 'bg-amber-500/12 text-amber-400 border-amber-500/25'
                  : 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
              }`}
            >
              {(metrics?.low_stock_count || 0) > 0 ? 'Needs attention' : 'All good'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums">
              {statsLoading ? '—' : metrics?.low_stock_count || 0}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {(metrics?.low_stock_count || 0) > 0 ? 'Products below threshold' : 'Stock levels are healthy'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Revenue & Profit Chart */}
        <div className="lg:col-span-8 glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Revenue & Profit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales performance over selected period
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 text-xs font-label">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>Profit</span>
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="inline-flex rounded-xl bg-white/[0.04] p-0.5 border border-white/10">
                {(['7D', '30D', '90D', 'YTD'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-2.5 py-1 text-xs font-label font-medium rounded-lg transition-all ${
                      chartTimeframe === tf
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="relative w-full h-64 pt-4">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-600">
                Loading...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-600">
                No data for this period
              </div>
            ) : (() => {
              const maxVal = Math.max(
                ...chartData.map((d) => Math.max(d.revenue, d.profit, 0)),
                1000
              );
              const numPoints = chartData.length;
              const svgWidth = 700;
              const svgHeight = 200;
              const paddingX = 25;
              const paddingBottom = 25;
              const paddingTop = 25;
              const availableHeight = svgHeight - paddingTop - paddingBottom;
              const baselineY = paddingTop + availableHeight;

              const points = chartData.map((d, i) => {
                const x =
                  numPoints > 1
                    ? paddingX + (i / (numPoints - 1)) * (svgWidth - 2 * paddingX)
                    : svgWidth / 2;
                const yRev = paddingTop + availableHeight * (1 - Math.max(0, d.revenue) / maxVal);
                const yProfit = paddingTop + availableHeight * (1 - Math.max(0, d.profit) / maxVal);
                return { x, yRev, yProfit, d };
              });

              const revPolyline = points.map((p) => `${p.x.toFixed(1)},${p.yRev.toFixed(1)}`).join(' ');
              const profitPolyline = points.map((p) => `${p.x.toFixed(1)},${p.yProfit.toFixed(1)}`).join(' ');

              const firstX = points[0]?.x ?? paddingX;
              const lastX = points[points.length - 1]?.x ?? (svgWidth - paddingX);

              const revPolygon = `${firstX},${baselineY} ${revPolyline} ${lastX},${baselineY}`;
              const profitPolygon = `${firstX},${baselineY} ${profitPolyline} ${lastX},${baselineY}`;

              const peakPoint = chartData.reduce(
                (max, cur) => (cur.revenue > (max?.revenue || 0) ? cur : max),
                chartData[0]
              );
              const peakCoord = points.find((p) => p.d.date === peakPoint?.date);

              // 5 milestone indices for X-axis labels
              const labelIndices = [
                0,
                Math.floor((numPoints - 1) * 0.25),
                Math.floor((numPoints - 1) * 0.5),
                Math.floor((numPoints - 1) * 0.75),
                numPoints - 1,
              ].filter((idx, pos, arr) => arr.indexOf(idx) === pos && idx >= 0 && idx < numPoints);

              return (
                <>
                  <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 700 200">
                    <defs>
                      <linearGradient id="violetChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="emeraldChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[40, 80, 120, 160].map((y) => (
                      <line key={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" x1="0" x2="700" y1={y} y2={y} />
                    ))}

                    {/* Profit Area & Line */}
                    <polygon points={profitPolygon} fill="url(#emeraldChartFill)" />
                    <polyline points={profitPolyline} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Revenue Area & Line */}
                    <polygon points={revPolygon} fill="url(#violetChartFill)" />
                    <polyline points={revPolyline} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Focus Points for Peak */}
                    {peakCoord && (
                      <g>
                        <circle cx={peakCoord.x} cy={peakCoord.yRev} fill="#8B5CF6" r="5" stroke="#070709" strokeWidth="2">
                          <title>Peak Revenue: ৳{peakPoint?.revenue.toLocaleString()} on {peakPoint?.date}</title>
                        </circle>
                        <circle cx={peakCoord.x} cy={peakCoord.yProfit} fill="#10B981" r="4" stroke="#070709" strokeWidth="2">
                          <title>Peak Day Profit: ৳{peakPoint?.profit.toLocaleString()}</title>
                        </circle>
                      </g>
                    )}
                  </svg>

                  {/* X Labels */}
                  <div className="flex justify-between px-2 pt-2 text-[11px] text-slate-500 font-mono">
                    {labelIndices.map((idx) => {
                      const item = chartData[idx];
                      if (!item) return null;
                      const dateObj = new Date(item.date);
                      const formatted = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                      const isPeak = item.date === peakPoint?.date;
                      return (
                        <span key={item.date} className={isPeak ? 'text-violet-400 font-semibold' : ''}>
                          {formatted} {isPeak ? '(Peak)' : ''}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Chart summary metrics */}
          {(() => {
            const numDays = chartData.length || 1;
            const avgDailySales = chartResponse?.total_revenue ? Math.round(chartResponse.total_revenue / numDays) : (metrics?.today_sales || 0);
            const avgDailyOrders = chartResponse?.total_orders ? Math.round(chartResponse.total_orders / numDays) : (metrics?.today_orders_count || 0);
            const peakPoint = chartData.reduce(
              (max, cur) => (cur.revenue > (max?.revenue || 0) ? cur : max),
              chartData[0]
            );
            const peakDateFormatted = peakPoint
              ? new Date(peakPoint.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '—';

            return (
              <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Avg Daily Sales</p>
                  <p className="text-sm font-bold text-white mt-1 tabular-nums">
                    {chartLoading ? '—' : formatBDT(avgDailySales)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Avg Daily Orders</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                    {chartLoading ? '—' : `${avgDailyOrders}/day`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Peak Day</p>
                  <p className="text-sm font-bold text-violet-300 mt-1 tabular-nums">
                    {peakPoint && peakPoint.revenue > 0 ? `${peakDateFormatted}` : '—'}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-4 glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                  {recentOrders.length}
                </span>
              </div>
              <Link href="/orders" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                View all
              </Link>
            </div>

            <div className="mt-2 divide-y divide-white/[0.05]">
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-body">
                  No orders recorded yet today.
                </div>
              ) : (
                recentOrders.slice(0, 6).map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const isReturned = order.status === 'returned';
                  const isFlagged = order.is_flagged || order.status === 'flagged';

                  return (
                    <div
                      key={order.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isDelivered
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isFlagged
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : isReturned
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                          }`}
                        >
                          {isDelivered ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : isFlagged ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : isReturned ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-200 font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {order.customer_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-white tabular-nums">
                          {formatBDT(order.total_amount)}
                        </div>
                        <Badge status={order.status} className="mt-0.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Link
            href="/orders"
            className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-violet-500/30 hover:bg-violet-500/08 text-slate-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
          >
            <span>Manage All Orders</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* SECTION 4: Quick Actions */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Items that need your attention</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Low Stock */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Low Stock</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-amber-400 font-semibold">{metrics?.low_stock_count || 0} products</span> below minimum
                </p>
              </div>
            </div>
            <Link
              href="/inventory"
              className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/22 border border-amber-500/25 text-amber-300 text-xs font-semibold text-center transition-all"
            >
              View Products
            </Link>
          </div>

          {/* Pending Orders */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Pending Orders</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-violet-300 font-semibold">{metrics?.pending_orders_count || 0} orders</span> to process
                </p>
              </div>
            </div>
            <Link
              href="/orders"
              className="px-3 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/22 border border-violet-500/25 text-violet-300 text-xs font-semibold text-center transition-all"
            >
              Manage Orders
            </Link>
          </div>

          {/* Customer Dues */}
          <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.05] p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Customer Dues</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Outstanding: <span className="text-pink-300 font-semibold font-mono">{formatBDT(metrics?.total_pending_due || 0)}</span>
                </p>
              </div>
            </div>
            <Link
              href="/due-loan"
              className="px-3 py-2 rounded-lg bg-pink-500/15 hover:bg-pink-500/22 border border-pink-500/25 text-pink-300 text-xs font-semibold text-center transition-all"
            >
              Collect Payments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
