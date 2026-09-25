import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createEmployeeSchema } from '@/lib/validators/salary';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse(employees || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = createEmployeeSchema.parse(body);

    const supabase = await createClient();

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        tenant_id: auth.tenantId,
        name: validated.name,
        phone: validated.phone || null,
        monthly_salary: validated.monthly_salary,
        salary_divisor: validated.salary_divisor,
        joined_at: validated.joined_at || new Date().toISOString().slice(0, 10),
      })
      .select('*')
      .single();

    if (error || !employee) {
      return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to add employee', 500);
    }

    return successResponse(employee, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
