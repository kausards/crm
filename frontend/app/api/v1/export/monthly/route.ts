import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { calculateOverallPnL } from '@/lib/accounting/pnl';
import { handleApiError } from '@/lib/apiResponse';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const from = `${month}-01`;
    // Compute the real last day of the month (handles Feb, 30-day months, etc.)
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate(); // day 0 of next month = last day of this month
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory & Accounts SaaS';
    workbook.created = new Date();

    // ── SHEET 1: Summary ──────────────────────────────────────────────
    const pnl = await calculateOverallPnL(supabase, auth.tenantId, from, to);
    const summarySheet = workbook.addWorksheet('P&L Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 28 },
      { header: 'Amount (BDT)', key: 'amount', width: 20 },
    ];
    summarySheet.addRows([
      { metric: 'Report Month', amount: month },
      { metric: 'Delivered Orders Count', amount: pnl.deliveredOrdersCount },
      { metric: 'Returned Orders Count', amount: pnl.returnedOrdersCount },
      { metric: 'Delivered Revenue', amount: pnl.revenue },
      { metric: 'Cost of Goods Sold (COGS)', amount: pnl.cogs },
      { metric: 'Return Costs Lost', amount: pnl.returnCost },
      { metric: 'Gross Profit', amount: pnl.grossProfit },
      { metric: 'Gross Margin %', amount: `${pnl.grossMarginPercent}%` },
      { metric: 'Operating Bills & Costs', amount: pnl.operatingCosts },
      { metric: 'Employee Salaries', amount: pnl.salaries },
      { metric: 'Net / Real Profit', amount: pnl.netProfit },
      { metric: 'Net Margin %', amount: `${pnl.netMarginPercent}%` },
    ]);

    // ── SHEET 2: Orders ───────────────────────────────────────────────
    const { data: orders } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, status, total_amount, cod_amount, delivery_charge, courier_provider, created_at')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    const ordersSheet = workbook.addWorksheet('Orders & Sales');
    ordersSheet.columns = [
      { header: 'Order ID', key: 'id', width: 14 },
      { header: 'Customer Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Total (BDT)', key: 'total', width: 14 },
      { header: 'COD (BDT)', key: 'cod', width: 14 },
      { header: 'Courier', key: 'courier', width: 14 },
      { header: 'Date', key: 'date', width: 20 },
    ];

    for (const o of orders || []) {
      ordersSheet.addRow({
        id: o.id.slice(0, 8),
        name: o.customer_name,
        phone: o.customer_phone,
        status: o.status,
        total: Number(o.total_amount),
        cod: Number(o.cod_amount),
        courier: o.courier_provider || 'N/A',
        date: o.created_at.slice(0, 10),
      });
    }

    // ── SHEET 3: Products ─────────────────────────────────────────────
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true);

    const prodSheet = workbook.addWorksheet('Products Inventory');
    prodSheet.columns = [
      { header: 'Product Name', key: 'name', width: 24 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Buy Price', key: 'buy', width: 14 },
      { header: 'Sell Price', key: 'sell', width: 14 },
      { header: 'Stock Qty', key: 'stock', width: 14 },
      { header: 'Stock Value', key: 'value', width: 16 },
    ];

    for (const p of products || []) {
      prodSheet.addRow({
        name: p.name,
        sku: p.sku || 'N/A',
        buy: Number(p.buy_price),
        sell: Number(p.sell_price),
        stock: p.stock_quantity,
        value: p.stock_quantity * Number(p.buy_price),
      });
    }

    // ── SHEET 4: Bill Costs ───────────────────────────────────────────
    const { data: costs } = await supabase
      .from('bill_costs')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    const costSheet = workbook.addWorksheet('Bill & Costs');
    costSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Cost Name', key: 'name', width: 24 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Amount (BDT)', key: 'amount', width: 16 },
      { header: 'Recurring', key: 'recurring', width: 14 },
    ];

    for (const c of costs || []) {
      costSheet.addRow({
        date: c.date,
        name: c.name,
        category: c.category || 'other',
        amount: Number(c.amount),
        recurring: c.is_recurring ? 'Yes' : 'No',
      });
    }

    // Format headers with styling
    workbook.eachSheet((sheet) => {
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="monthly-report-${month}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
