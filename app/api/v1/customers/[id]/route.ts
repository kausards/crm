import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(
  _req: NextRequest,
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

    // Calculate due
    const { data: dues } = await supabase
      .from('due_ledger')
      .select('type, amount')
      .eq('customer_id', id)
      .eq('tenant_id', auth.tenantId);

    let currentDue = 0;
    for (const d of dues || []) {
      const amt = Number(d.amount) || 0;
      if (d.type === 'credit') currentDue += amt;
      else currentDue -= amt;
    }

    return successResponse({
      customer: {
        ...customer,
        current_due: Math.round(currentDue * 100) / 100,
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
    const supabase = await createClient();

    // Check customer exists
    const { data: existing, error: existErr } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .single();

    if (existErr || !existing) {
      return errorResponse('NOT_FOUND', 'Customer not found', 404);
    }

    // If phone is updated, ensure uniqueness
    if (body.phone && body.phone !== existing.phone) {
      const { data: duplicate } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('phone', body.phone)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return errorResponse('CONFLICT', 'Another customer with this phone number already exists', 409);
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.address !== undefined) updates.address = body.address ? body.address.trim() : null;
    if (body.notes !== undefined) updates.notes = body.notes ? body.notes.trim() : null;

    const { data: updated, error: updateErr } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return successResponse({ customer: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = PATCH;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    // Unlink any due ledger entries before deleting customer to prevent FK violation
    await supabase
      .from('due_ledger')
      .update({ customer_id: null })
      .eq('customer_id', id)
      .eq('tenant_id', auth.tenantId);

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) throw error;

    return successResponse({ deleted: true, id });
  } catch (err) {
    return handleApiError(err);
  }
}
