import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

function getBangladeshTodayRange(dateParam: string | null): { bdDate: string; startIso: string; endIso: string } {
  const bdOffsetMs = 6 * 60 * 60 * 1000;
  let bdDate: string;
  if (dateParam) {
    bdDate = dateParam;
  } else {
    const nowUtc = new Date();
    const bdNow = new Date(nowUtc.getTime() + bdOffsetMs);
    bdDate = bdNow.toISOString().slice(0, 10);
  }

  const [year, month, day] = bdDate.split('-').map(Number);
  const bdMidnightUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - bdOffsetMs;
  const bdEndUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - bdOffsetMs;

  return {
    bdDate,
    startIso: new Date(bdMidnightUtcMs).toISOString(),
    endIso: new Date(bdEndUtcMs).toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const { bdDate, startIso, endIso } = getBangladeshTodayRange(searchParams.get('date'));
    const targetDate = bdDate;

    // 1. Fetch today's orders with items for sales & profit calculation
    const { data: todayOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, status, total_amount, cod_amount, delivery_charge, created_at, order_items(quantity, buy_price, sell_price)')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (ordersErr) throw ordersErr;

    let todaySales = 0;
    let todayCogs = 0;
    let todayOrdersCount = (todayOrders || []).length;
    let todayDeliveredCount = 0;

    for (const order of todayOrders || []) {
      // Exclude cancelled and returned orders from sales & profit
      if (order.status !== 'cancelled' && order.status !== 'returned') {
        todaySales += Number(order.total_amount) || 0;
        
        if (order.status === 'delivered') {
          todayDeliveredCount++;
        }

        const items = (order.order_items as unknown as Array<{ quantity: number; buy_price: number; sell_price: number }>) || [];
        for (const item of items) {
          todayCogs += (Number(item.quantity) || 0) * (Number(item.buy_price) || 0);
        }
      }
    }

    const todayProfit = Math.round((todaySales - todayCogs) * 100) / 100;

    // 2. Pending orders count
    const { count: pendingOrdersCount, error: pendingErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'pending');

    if (pendingErr) throw pendingErr;

    // 3. Low stock products count
    const { data: activeProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, stock_quantity, low_stock_threshold')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true);

    if (prodErr) throw prodErr;

    const lowStockCount = (activeProducts || []).filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    ).length;

    // 4. Pending customer due (sum credit - sum debit)
    const { data: dueRows, error: dueErr } = await supabase
      .from('due_ledger')
      .select('type, amount')
      .eq('tenant_id', auth.tenantId);

    if (dueErr) throw dueErr;

    let totalPendingDue = 0;
    for (const row of dueRows || []) {
      const amt = Number(row.amount) || 0;
      if (row.type === 'credit') {
        totalPendingDue += amt;
      } else {
        totalPendingDue -= amt;
      }
    }

    // 5. Total loan balance (sum borrowed - sum repaid)
    const { data: loanRows, error: loanErr } = await supabase
      .from('loan_ledger')
      .select('type, amount')
      .eq('tenant_id', auth.tenantId);

    if (loanErr) throw loanErr;

    let totalLoanBalance = 0;
    for (const row of loanRows || []) {
      const amt = Number(row.amount) || 0;
      if (row.type === 'borrowed') {
        totalLoanBalance += amt;
      } else {
        totalLoanBalance -= amt;
      }
    }

    // 6. Recent 5 orders for dashboard feed
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, status, total_amount, courier_provider, created_at')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    return successResponse({
      date: targetDate,
      metrics: {
        today_sales: Math.round(todaySales * 100) / 100,
        today_profit: todayProfit,
        today_orders_count: todayOrdersCount,
        today_delivered_count: todayDeliveredCount,
        pending_orders_count: pendingOrdersCount || 0,
        low_stock_count: lowStockCount,
        total_pending_due: Math.max(0, Math.round(totalPendingDue * 100) / 100),
        total_loan_balance: Math.max(0, Math.round(totalLoanBalance * 100) / 100),
      },
      recent_orders: recentOrders || [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
