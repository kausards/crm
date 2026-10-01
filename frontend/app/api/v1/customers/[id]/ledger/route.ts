import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

const addCustomerLedgerSchema = z.object({
  type: z.enum(['credit', 'debit']), // credit = money owed by customer, debit = payment received from customer
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(255).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    // Verify customer exists
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (custErr || !customer) {
      return errorResponse('NOT_FOUND', 'Customer not found', 404);
    }

    // Fetch transactions by customer_id or party_phone match
    const { data: entries, error } = await supabase
      .from('due_ledger')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .or(`customer_id.eq.${id},party_phone.eq.${customer.phone}`)
      .order('date', { ascending: false });

    if (error) throw error;

    let totalCredit = 0;
    let totalDebit = 0;

    for (const item of entries || []) {
      const amt = Number(item.amount) || 0;
      if (item.type === 'credit') {
        totalCredit += amt;
      } else {
        totalDebit += amt;
      }
    }

    const outstandingBalance = Math.round((totalCredit - totalDebit) * 100) / 100;

    return successResponse({
      customer,
      summary: {
        total_credit: Math.round(totalCredit * 100) / 100,
        total_debit: Math.round(totalDebit * 100) / 100,
        outstanding_balance: outstandingBalance,
      },
      transactions: entries || [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const validated = addCustomerLedgerSchema.parse(body);

    const supabase = await createClient();

    // Verify customer exists
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (custErr || !customer) {
      return errorResponse('NOT_FOUND', 'Customer not found', 404);
    }

    const { data: entry, error: insertErr } = await supabase
      .from('due_ledger')
      .insert({
        tenant_id: auth.tenantId,
        customer_id: customer.id,
        party_name: customer.name,
        party_phone: customer.phone,
        type: validated.type,
        amount: validated.amount,
        note: validated.note || null,
        date: validated.date,
      })
      .select('*')
      .single();

    if (insertErr || !entry) {
      return errorResponse('INTERNAL_ERROR', insertErr?.message || 'Failed to add ledger entry', 500);
    }

    return successResponse(entry, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
