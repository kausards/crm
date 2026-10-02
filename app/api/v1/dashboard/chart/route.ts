import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultFromStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const from = searchParams.get('from') || defaultFromStr;
    const to = searchParams.get('to') || todayStr;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, total_amount, status, order_items(quantity, buy_price)')
      .eq('tenant_id', auth.tenantId)
      .not('status', 'in', '(cancelled,returned)')
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`);

    if (error) throw error;

    // Group by day YYYY-MM-DD
    const byDate: Record<string, { revenue: number; cogs: number; orders_count: number }> = {};

    for (const order of orders || []) {
      const date = order.created_at.slice(0, 10);
      if (!byDate[date]) {
        byDate[date] = { revenue: 0, cogs: 0, orders_count: 0 };
      }
      byDate[date].revenue += Number(order.total_amount) || 0;
      byDate[date].orders_count += 1;

      for (const item of (order.order_items || []) as any[]) {
        const qty = Number(item.quantity) || 0;
        const buy = Number(item.buy_price) || 0;
        byDate[date].cogs += qty * buy;
      }
    }

    // Generate continuous date array between from and to
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    const dayMs = 24 * 60 * 60 * 1000;
    const result: Array<{
      date: string;
      revenue: number;
      profit: number;
      orders_count: number;
    }> = [];

    for (let t = fromDate.getTime(); t <= toDate.getTime(); t += dayMs) {
      const dStr = new Date(t).toISOString().slice(0, 10);
      const metrics = byDate[dStr] || { revenue: 0, cogs: 0, orders_count: 0 };
      const profit = Math.round((metrics.revenue - metrics.cogs) * 100) / 100;
      result.push({
        date: dStr,
        revenue: Math.round(metrics.revenue * 100) / 100,
        profit,
        orders_count: metrics.orders_count,
      });
    }

    return successResponse({
      from,
      to,
      total_revenue: result.reduce((acc, r) => acc + r.revenue, 0),
      total_profit: result.reduce((acc, r) => acc + r.profit, 0),
      total_orders: result.reduce((acc, r) => acc + r.orders_count, 0),
      data: result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
