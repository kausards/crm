'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Boxes,
  FileText,
  ClipboardList,
  Users,
  BarChart3,
} from 'lucide-react';
import { fetchApi, formatBDT } from '@/lib/apiClient';
import { useAuth } from '@/app/providers';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/shadcn/avatar";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/shadcn/chart";
import { Progress } from "@/components/ui/shadcn/progress";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
};

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

  const STATS = [
    {
      label: "Today's Sales",
      value: statsLoading ? '...' : formatBDT(metrics?.today_sales || 0),
      hint: "Total revenue today",
      icon: TrendingUp,
    },
    {
      label: "Today's Orders",
      value: statsLoading ? '...' : String(metrics?.today_orders_count || 0),
      hint: "Orders placed today",
      icon: Package,
    },
    {
      label: "Pending Orders",
      value: statsLoading ? '...' : String(metrics?.pending_orders_count || 0),
      hint: "To be processed",
      icon: AlertTriangle,
    },
    {
      label: "Low Stock",
      value: statsLoading ? '...' : String(metrics?.low_stock_count || 0),
      hint: "Items need restock",
      icon: Boxes,
    },
  ];

  // Map chartData to the format expected by Recharts (format date for XAxis)
  const formattedChartData = chartData.map(d => ({
    ...d,
    formattedDate: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));

  const orderCompletionRate = metrics?.today_orders_count
    ? Math.round(((metrics.today_delivered_count || 0) / metrics.today_orders_count) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon
                aria-hidden
                className="size-5 text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue & Profit</CardTitle>
            <CardDescription>
              Financial performance over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            {(['7D', '30D', '90D', 'YTD'] as const).map((tf) => (
              <Button
                key={tf}
                variant={chartTimeframe === tf ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartTimeframe(tf)}
                className="h-7 px-2 text-xs"
              >
                {tf}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-64 w-full flex items-center justify-center text-muted-foreground text-sm">
              Loading data...
            </div>
          ) : formattedChartData.length === 0 ? (
            <div className="h-64 w-full flex items-center justify-center text-muted-foreground text-sm">
              No data for this period
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart
                data={formattedChartData}
                margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-profit)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-profit)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value >= 1000 ? (value/1000) + 'k' : value}`}
                  width={40} 
                />
                {/* @ts-ignore */}
                <ChartTooltip content={<ChartTooltipContent /> as any} />
                <ChartLegend content={<ChartLegendContent payload={[]} /> as any} />
                
                <Area
                  dataKey="revenue"
                  type="monotone"
                  stroke="var(--color-revenue)"
                  strokeDasharray="4 4"
                  fill="none"
                  strokeWidth={2}
                />
                <Area
                  dataKey="profit"
                  type="monotone"
                  stroke="var(--color-profit)"
                  fill="url(#colorProfit)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Action Needed</CardTitle>
            <CardDescription>Metrics requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium">Order Success Rate</h3>
                <Badge variant={orderCompletionRate > 80 ? "default" : "secondary"}>
                  {metrics?.today_delivered_count || 0} / {metrics?.today_orders_count || 0} Delivered
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of today's orders successfully delivered
              </p>
              <div className="flex items-center gap-3">
                <Progress value={orderCompletionRate} aria-label="Order completion progress" />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {orderCompletionRate}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium">Stock Level</h3>
                <Badge variant={metrics?.low_stock_count ? "destructive" : "default"}>
                  {metrics?.low_stock_count || 0} Items Low
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Inventory items nearing out of stock status
              </p>
              <div className="flex items-center gap-3">
                <Progress 
                  value={metrics?.low_stock_count ? Math.min(100, metrics.low_stock_count * 5) : 0} 
                  aria-label="Low stock progress" 
                  className="[&>div]:bg-amber-500"
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {metrics?.low_stock_count || 0}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-medium">Outstanding Dues</h3>
                <Badge variant={metrics?.total_pending_due ? "secondary" : "outline"}>
                  {formatBDT(metrics?.total_pending_due || 0)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Pending amounts to be collected
              </p>
              <div className="flex items-center gap-3">
                <Progress 
                  value={metrics?.total_pending_due ? Math.min(100, metrics.total_pending_due / 1000) : 0} 
                  aria-label="Pending dues progress" 
                  className="[&>div]:bg-indigo-500"
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatBDT(metrics?.total_pending_due || 0)}
                </span>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from your store</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm font-medium text-muted-foreground">
                No orders recorded yet today.
              </div>
            ) : (
              <ol className="flex flex-col gap-4">
                {recentOrders.slice(0, 5).map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const isFlagged = order.is_flagged || order.status === 'flagged';
                  
                  return (
                    <li key={order.id} className="flex items-start gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className={`text-xs ${
                          isDelivered ? 'bg-emerald-100 text-emerald-700' : isFlagged ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {order.customer_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">
                            {order.customer_name}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            placed order #{order.id.slice(0,8)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatBDT(order.total_amount)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
