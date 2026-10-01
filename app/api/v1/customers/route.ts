import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { createCustomerSchema } from '@/lib/validators/customer';
import { successResponse, paginatedResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', auth.tenantId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const customerList = customers || [];
    const customerIds = customerList.map((c) => c.id);

    // Calculate outstanding due for each customer from due_ledger
    const dueByCustomer: Record<string, number> = {};
    if (customerIds.length > 0) {
      const { data: dues } = await supabase
        .from('due_ledger')
        .select('customer_id, type, amount')
        .eq('tenant_id', auth.tenantId)
        .in('customer_id', customerIds);

      for (const d of dues || []) {
        if (!d.customer_id) continue;
        const amt = Number(d.amount) || 0;
        if (!dueByCustomer[d.customer_id]) dueByCustomer[d.customer_id] = 0;
        if (d.type === 'credit') {
          dueByCustomer[d.customer_id] += amt;
        } else {
          dueByCustomer[d.customer_id] -= amt;
        }
      }
    }

    const enriched = customerList.map((c) => ({
      ...c,
      current_due: Math.round((dueByCustomer[c.id] || 0) * 100) / 100,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    return paginatedResponse(enriched, { total, page, limit, totalPages });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const validated = createCustomerSchema.parse(body);

    const supabase = await createClient();

    // Check if customer with same phone already exists for this tenant
    const { data: existing } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', auth.tenantId)
      .eq('phone', validated.phone)
      .maybeSingle();

    if (existing) {
      return errorResponse(
        'CONFLICT',
        `A customer with phone number ${validated.phone} already exists (${existing.name})`,
        409
      );
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: auth.tenantId,
        name: validated.name,
        phone: validated.phone,
        address: validated.address || null,
        notes: validated.notes || null,
      })
      .select('*')
      .single();

    if (error || !newCustomer) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to create customer', 500);
    }

    return successResponse({
      customer: {
        ...newCustomer,
        current_due: 0,
      },
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
