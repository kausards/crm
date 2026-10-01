import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createBillCostSchema } from '@/lib/validators/billCost';
import { createClient } from '@/lib/supabase/server';
import { successResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');

    let query = supabase
      .from('bill_costs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', auth.tenantId);

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (category) query = query.eq('category', category);

    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    const { data: costs, count, error } = await query
      .order('date', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(costs || [], {
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = createBillCostSchema.parse(body);

    const supabase = await createClient();

    const { data: cost, error } = await supabase
      .from('bill_costs')
      .insert({
        tenant_id: auth.tenantId,
        name: validated.name,
        amount: validated.amount,
        date: validated.date,
        is_recurring: validated.is_recurring,
        frequency: validated.frequency || null,
        category: validated.category || 'other',
      })
      .select('*')
      .single();

    if (error || !cost) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to save bill cost', 500);
    }

    return successResponse(cost, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
