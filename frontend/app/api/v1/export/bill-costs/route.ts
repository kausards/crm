import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/apiResponse';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    let from = searchParams.get('from');
    let to = searchParams.get('to');
    const category = searchParams.get('category');

    if (!from || !to) {
      const activeMonth = month || new Date().toISOString().slice(0, 7);
      from = `${activeMonth}-01`;
      const [year, mon] = activeMonth.split('-').map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      to = `${activeMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    let query = supabase
      .from('bill_costs')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: costs, error } = await query;
    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory & Accounts SaaS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bills & Costs');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Cost Name', key: 'name', width: 28 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Amount (BDT)', key: 'amount', width: 18 },
      { header: 'Recurring', key: 'recurring', width: 14 },
      { header: 'Frequency', key: 'frequency', width: 14 },
    ];

    let grandTotal = 0;
    for (const c of costs || []) {
      const amt = Number(c.amount) || 0;
      grandTotal += amt;
      sheet.addRow({
        date: c.date,
        name: c.name,
        category: c.category || 'other',
        amount: amt,
        recurring: c.is_recurring ? 'Yes' : 'No',
        frequency: c.frequency || 'N/A',
      });
    }

    // Add total row
    sheet.addRow({});
    const totalRow = sheet.addRow({
      name: 'TOTAL EXPENSES',
      amount: grandTotal,
    });
    totalRow.font = { bold: true };

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bill-costs-${from}-to-${to}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
