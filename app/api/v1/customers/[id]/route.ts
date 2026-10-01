import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { updateCustomerSchema } from '@/lib/validators/customer';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (error || !customer) {
      return errorResponse('NOT_FOUND', 'Customer not found', 404);
    }

    // Get current due
    const { data: dues } = await supabase
      .from('due_ledger')
      .select('type, amount')
      .eq('tenant_id', auth.tenantId)
      .eq('customer_id', id);

    let totalDue = 0;
    for (const d of dues || []) {
      const amt = Number(d.amount) || 0;
      if (d.type === 'credit') totalDue += amt;
      else totalDue -= amt;
    }

    return successResponse({
      customer: {
        ...customer,
        current_due: Math.round(totalDue * 100) / 100,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const validated = updateCustomerSchema.parse(body);

    const supabase = await createClient();

    // If phone is changing, check uniqueness for tenant
    if (validated.phone) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('phone', validated.phone)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return errorResponse('CONFLICT', `Phone number ${validated.phone} is already in use by another customer`, 409);
      }
    }

    const { data: updated, error } = await supabase
      .from('customers')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (error || !updated) {
      return errorResponse('NOT_FOUND', 'Customer not found or update failed', 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('NOT_FOUND', 'Customer not found or delete failed', 404);
    }

    return successResponse({ message: 'Customer deleted successfully' });
  } catch (err) {
    return handleApiError(err);
  }
}
