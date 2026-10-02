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
  const isOwner = user?.role === 'owner';
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
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            Pulse · {user?.full_name?.split(' ')[0] || 'Merchant'} <span className="text-amber-400">⚡</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-body">
            {user?.business_name || 'Your Store'} · Real-time Dhaka core & courier telemetry
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/accounts"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-label font-medium text-slate-200 backdrop-blur-md transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* SECTION 2: 4 Glass KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Revenue */}
        <div className="group relative overflow-hidden glass-card p-5 hover:-translate-y-0.5 hover:border-violet-500/40 transition-all duration-200">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-violet-600/10 rounded-full blur-xl group-hover:bg-violet-600/20 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-semibold">
              Today&apos;s Revenue
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-label font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-3 h-3" /> +18%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight tabular-nums">
              {statsLoading ? '—' : formatBDT(metrics?.today_sales || 0)}
            </div>
            <p className="mt-2 text-[11px] font-body text-slate-400 flex items-center gap-1.5 truncate">
              <span className="text-slate-300">{metrics?.today_orders_count || 0} orders</span>
              <span className="text-slate-600">·</span>
              <span className="text-pink-400 font-medium">Auto-synced</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Today's Orders */}
        <div className="group relative overflow-hidden glass-card p-5 hover:-translate-y-0.5 hover:border-pink-500/40 transition-all duration-200">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-pink-600/10 rounded-full blur-xl group-hover:bg-pink-600/20 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-semibold">
              Orders Volume
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-label font-medium bg-pink-500/15 text-pink-300 border border-pink-500/30">
              {metrics?.today_orders_count || 0} Total
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight tabular-nums">
              {statsLoading ? '—' : metrics?.today_orders_count || 0}
            </div>
            <p className="mt-2 text-[11px] font-body text-slate-400 truncate">
              <span className="text-emerald-400 font-medium">{metrics?.today_delivered_count || 0} delivered</span>
              <span className="text-slate-600"> · </span>
              <span className="text-amber-400">{metrics?.pending_orders_count || 0} pending</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Gross / Net Profit */}
        <div className="group relative overflow-hidden glass-card p-5 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all duration-200">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-600/10 rounded-full blur-xl group-hover:bg-emerald-600/20 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-semibold">
              Gross Profit (30D)
            </span>
            {pnl && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-label font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {pnl.gross_margin_percent?.toFixed(1)}% margin
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight tabular-nums">
              {isOwner ? (pnl ? formatBDT(pnl.gross_profit) : '—') : 'N/A'}
            </div>
            <p className="mt-2 text-[11px] font-body text-slate-400 truncate">
              {pnl ? `Net Profit: ${formatBDT(pnl.net_profit)}` : 'Deterministic accounting'}
            </p>
          </div>
        </div>

        {/* KPI 4: Low Stock Alert */}
        <div className="group relative overflow-hidden glass-card p-5 hover:-translate-y-0.5 hover:border-amber-500/40 transition-all duration-200">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition-all pointer-events-none" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-semibold">
              Low Stock Alert
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-label font-medium border ${
                (metrics?.low_stock_count || 0) > 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {(metrics?.low_stock_count || 0) > 0 ? 'Action Needed' : 'Healthy'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight tabular-nums">
              {statsLoading ? '—' : `${metrics?.low_stock_count || 0} SKUs`}
            </div>
            <p className="mt-2 text-[11px] font-body text-slate-400 truncate">
              {(metrics?.low_stock_count || 0) > 0
                ? 'SKUs ≤ 5 threshold in warehouse'
                : 'Stock levels optimal across hubs'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Revenue & Profit Visual Chart */}
        <div className="lg:col-span-8 glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-sm font-headline font-bold text-white tracking-tight">
                Revenue & Profit Dynamics
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-body">
                30-day rolling performance curve across sales channels
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

          {/* SVG Chart Canvas */}
          <div className="relative w-full h-64 pt-4">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                Calculating revenue telemetry...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No transaction data in this timeframe
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
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] font-label text-slate-400 uppercase tracking-wider">Avg Daily Sales</div>
                  <div className="text-sm font-headline font-bold text-white mt-0.5 tabular-nums">
                    {chartLoading ? '—' : formatBDT(avgDailySales)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-label text-slate-400 uppercase tracking-wider">Avg Daily Orders</div>
                  <div className="text-sm font-headline font-bold text-emerald-400 mt-0.5 tabular-nums">
                    {chartLoading ? '—' : `${avgDailyOrders} orders / day`}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-label text-slate-400 uppercase tracking-wider">Peak Sales Day</div>
                  <div className="text-sm font-headline font-bold text-violet-300 mt-0.5 tabular-nums">
                    {peakPoint && peakPoint.revenue > 0 ? `${peakDateFormatted} (${formatBDT(peakPoint.revenue)})` : '—'}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Recent Orders Glass Table */}
        <div className="lg:col-span-4 glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-headline font-bold text-white">Live Dispatches</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {recentOrders.length}
                </span>
              </div>
              <Link href="/orders" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                View all →
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
            className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/10 text-slate-200 text-xs font-label font-medium transition-all flex items-center justify-center gap-1.5"
          >
            <span>Manage Orders Feed</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* SECTION 4: Action Items */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-headline font-bold text-white">Operations Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-body">Direct pipeline tasks requiring action</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-label font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Courier Webhooks Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Low Stock */}
          <div className="glass-card p-4 flex flex-col justify-between gap-3 border-l-2 border-l-amber-500">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-headline font-semibold text-slate-100">Low Stock SKUs</div>
                <div className="text-xs text-slate-400 mt-0.5 font-body">
                  <span className="font-bold text-amber-300">{metrics?.low_stock_count || 0} items</span> below safety threshold
                </div>
              </div>
            </div>
            <Link
              href="/inventory"
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-label font-medium text-center transition-all"
            >
              Reorder SKUs
            </Link>
          </div>

          {/* Card 2: Pending Dispatches */}
          <div className="glass-card p-4 flex flex-col justify-between gap-3 border-l-2 border-l-violet-500">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-headline font-semibold text-slate-100">Pending Courier Dispatches</div>
                <div className="text-xs text-slate-400 mt-0.5 font-body">
                  <span className="font-bold text-violet-300">{metrics?.pending_orders_count || 0} orders</span> awaiting consignment
                </div>
              </div>
            </div>
            <Link
              href="/orders"
              className="mt-2 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-label font-medium text-center transition-all"
            >
              Batch Dispatch
            </Link>
          </div>

          {/* Card 3: Customer Dues */}
          <div className="glass-card p-4 flex flex-col justify-between gap-3 border-l-2 border-l-pink-500">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-headline font-semibold text-slate-100">Customer Dues (বাকির খাতা)</div>
                <div className="text-xs text-slate-400 mt-0.5 font-body">
                  Outstanding: <span className="font-mono font-bold text-pink-300">{formatBDT(metrics?.total_pending_due || 0)}</span>
                </div>
              </div>
            </div>
            <Link
              href="/due-loan"
              className="mt-2 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-label font-medium text-center transition-all"
            >
              Collect Payments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
