import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { attendanceSchema } from '@/lib/validators/salary';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const auth = await requireAuth(true); // Owner only
    const { employeeId } = await params;
    const body = await req.json();

    const validated = attendanceSchema.parse({
      ...body,
      employee_id: employeeId,
    });

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          tenant_id: auth.tenantId,
          employee_id: employeeId,
          date: validated.date,
          status: validated.status,
        },
        { onConflict: 'employee_id,date' }
      )
      .select('*')
      .single();

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
