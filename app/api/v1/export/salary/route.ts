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
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const monthStart = month.length === 7 ? `${month}-01` : month;
    const monthShort = month.slice(0, 7);

    const { data: runs, error } = await supabase
      .from('salary_runs')
      .select('*, employees(name, phone, monthly_salary)')
      .eq('tenant_id', auth.tenantId)
      .in('month', [monthStart, monthShort])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory & Accounts SaaS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Salary - ${month}`);
    sheet.columns = [
      { header: 'Employee Name', key: 'name', width: 24 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Base Monthly Salary (BDT)', key: 'base', width: 26 },
      { header: 'Days Present', key: 'present', width: 14 },
      { header: 'Days Absent', key: 'absent', width: 14 },
      { header: 'Gross Salary (BDT)', key: 'gross', width: 20 },
      { header: 'Deductions (BDT)', key: 'deduction', width: 18 },
      { header: 'Manual Override (BDT)', key: 'override', width: 22 },
      { header: 'Net Payable (BDT)', key: 'net', width: 18 },
      { header: 'Payment Status', key: 'status', width: 16 },
      { header: 'Paid At', key: 'paidAt', width: 16 },
    ];

    let grandNetPayable = 0;

    for (const r of runs || []) {
      const emp = (r.employees as unknown as { name: string; phone: string | null; monthly_salary: number }) || { name: 'Unknown', phone: null, monthly_salary: 0 };
      const net = Number(r.net_payable) || 0;
      grandNetPayable += net;

      sheet.addRow({
        name: emp.name,
        phone: emp.phone || 'N/A',
        base: Number(emp.monthly_salary) || 0,
        present: r.days_present,
        absent: r.days_absent,
        gross: Number(r.gross_salary) || 0,
        deduction: Number(r.deduction) || 0,
        override: r.manual_override !== null ? Number(r.manual_override) : 'N/A',
        net: net,
        status: r.paid_at ? 'Paid' : 'Unpaid',
        paidAt: r.paid_at ? r.paid_at.slice(0, 10) : '-',
      });
    }

    sheet.addRow({});
    const totalRow = sheet.addRow({
      name: 'TOTAL PAYOUT',
      net: grandNetPayable,
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
        'Content-Disposition': `attachment; filename="salary-report-${month}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
