import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { calculateProductPnL } from '@/lib/accounting/pnl';
import { handleApiError } from '@/lib/apiResponse';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory & Accounts SaaS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Product P&L');
    sheet.columns = [
      { header: 'Product Name', key: 'name', width: 28 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Buy Price (BDT)', key: 'buy', width: 16 },
      { header: 'Sell Price (BDT)', key: 'sell', width: 16 },
      { header: 'Stock Qty', key: 'stock', width: 12 },
      { header: 'Stock Value (BDT)', key: 'stockValue', width: 18 },
      { header: 'Units Sold', key: 'unitsSold', width: 14 },
      { header: 'Total Revenue (BDT)', key: 'revenue', width: 20 },
      { header: 'Total COGS (BDT)', key: 'cogs', width: 18 },
      { header: 'Gross Profit (BDT)', key: 'profit', width: 18 },
      { header: 'Margin %', key: 'margin', width: 14 },
    ];

    let grandStockValue = 0;
    let grandRevenue = 0;
    let grandCogs = 0;
    let grandProfit = 0;

    for (const p of products || []) {
      const pnl = await calculateProductPnL(supabase, auth.tenantId, p.id);
      grandStockValue += pnl.stockValue;
      grandRevenue += pnl.totalRevenue;
      grandCogs += pnl.totalCogs;
      grandProfit += pnl.grossProfit;

      sheet.addRow({
        name: pnl.productName,
        sku: pnl.sku || 'N/A',
        buy: pnl.buyPrice,
        sell: pnl.sellPrice,
        stock: pnl.currentStock,
        stockValue: pnl.stockValue,
        unitsSold: pnl.totalUnitsSold,
        revenue: pnl.totalRevenue,
        cogs: pnl.totalCogs,
        profit: pnl.grossProfit,
        margin: `${pnl.marginPercent}%`,
      });
    }

    // Add summary row
    sheet.addRow({});
    const totalRow = sheet.addRow({
      name: 'TOTALS',
      stockValue: grandStockValue,
      revenue: grandRevenue,
      cogs: grandCogs,
      profit: grandProfit,
      margin: grandRevenue > 0 ? `${Math.round(((grandProfit / grandRevenue) * 100) * 10) / 10}%` : '0%',
    });
    totalRow.font = { bold: true };

    // Format header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="product-pnl-report-${dateStr}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
