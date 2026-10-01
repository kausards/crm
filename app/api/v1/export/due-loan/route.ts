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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // 1. Fetch due_ledger
    let dueQuery = supabase
      .from('due_ledger')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .order('date', { ascending: false });

    if (from) dueQuery = dueQuery.gte('date', from);
    if (to) dueQuery = dueQuery.lte('date', to);

    const { data: dues, error: dueErr } = await dueQuery;
    if (dueErr) throw dueErr;

    // 2. Fetch loan_ledger
    let loanQuery = supabase
      .from('loan_ledger')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .order('date', { ascending: false });

    if (from) loanQuery = loanQuery.gte('date', from);
    if (to) loanQuery = loanQuery.lte('date', to);

    const { data: loans, error: loanErr } = await loanQuery;
    if (loanErr) throw loanErr;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory & Accounts SaaS';
    workbook.created = new Date();

    // ── SHEET 1: Due Ledger ──────────────────────────────────────────
    const dueSheet = workbook.addWorksheet('Customer Due Ledger');
    dueSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Party / Customer Name', key: 'name', width: 24 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Type (Credit=Owed / Debit=Paid)', key: 'type', width: 30 },
      { header: 'Amount (BDT)', key: 'amount', width: 18 },
      { header: 'Note', key: 'note', width: 30 },
    ];

    let totalDueCredit = 0;
    let totalDueDebit = 0;

    for (const d of dues || []) {
      const amt = Number(d.amount) || 0;
      if (d.type === 'credit') totalDueCredit += amt;
      else totalDueDebit += amt;

      dueSheet.addRow({
        date: d.date,
        name: d.party_name,
        phone: d.party_phone || 'N/A',
        type: d.type === 'credit' ? 'Credit (Customer owes us)' : 'Debit (Customer paid)',
        amount: amt,
        note: d.note || '',
      });
    }

    const netCustomerDue = totalDueCredit - totalDueDebit;
    dueSheet.addRow({});
    const dueSummary1 = dueSheet.addRow({ name: 'TOTAL CREDIT (OWED BY CUSTOMERS)', amount: totalDueCredit });
    const dueSummary2 = dueSheet.addRow({ name: 'TOTAL DEBIT (PAID BY CUSTOMERS)', amount: totalDueDebit });
    const dueSummary3 = dueSheet.addRow({ name: 'NET RECEIVABLE BALANCE', amount: netCustomerDue });
    dueSummary1.font = { bold: true };
    dueSummary2.font = { bold: true };
    dueSummary3.font = { bold: true };

    // ── SHEET 2: Loan Ledger ─────────────────────────────────────────
    const loanSheet = workbook.addWorksheet('Loan & Borrowing Ledger');
    loanSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Party / Lender Name', key: 'name', width: 24 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Type', key: 'type', width: 26 },
      { header: 'Amount (BDT)', key: 'amount', width: 18 },
      { header: 'Note', key: 'note', width: 30 },
    ];

    let totalBorrowed = 0;
    let totalRepaid = 0;

    for (const l of loans || []) {
      const amt = Number(l.amount) || 0;
      if (l.type === 'borrowed') totalBorrowed += amt;
      else totalRepaid += amt;

      loanSheet.addRow({
        date: l.date,
        name: l.party_name,
        phone: l.party_phone || 'N/A',
        type: l.type === 'borrowed' ? 'Borrowed (We owe them)' : 'Repaid (We paid back)',
        amount: amt,
        note: l.note || '',
      });
    }

    const netLoanPayable = totalBorrowed - totalRepaid;
    loanSheet.addRow({});
    const loanSummary1 = loanSheet.addRow({ name: 'TOTAL BORROWED', amount: totalBorrowed });
    const loanSummary2 = loanSheet.addRow({ name: 'TOTAL REPAID', amount: totalRepaid });
    const loanSummary3 = loanSheet.addRow({ name: 'NET PAYABLE BALANCE', amount: netLoanPayable });
    loanSummary1.font = { bold: true };
    loanSummary2.font = { bold: true };
    loanSummary3.font = { bold: true };

    // Header styling
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
    const dateStr = new Date().toISOString().slice(0, 10);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="due-loan-report-${dateStr}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
