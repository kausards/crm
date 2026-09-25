import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createDueSchema } from '@/lib/validators/dueLoan';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const party = searchParams.get('party');

    let query = supabase
      .from('due_ledger')
      .select('*')
      .eq('tenant_id', auth.tenantId);

    if (party) {
      query = query.ilike('party_name', `%${party}%`);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = createDueSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('due_ledger')
      .insert({
        tenant_id: auth.tenantId,
        party_name: validated.party_name,
        party_phone: validated.party_phone || null,
        type: validated.type,
        amount: validated.amount,
        note: validated.note || null,
        date: validated.date,
      })
      .select('*')
      .single();

    if (error || !data) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to save due ledger entry', 500);
    }

    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
