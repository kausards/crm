import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    let query = supabase
      .from('profiles')
      .select('id, tenant_id, role, full_name, email, created_at')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: true });

    if (role && (role === 'owner' || role === 'staff')) {
      query = query.eq('role', role);
    }

    const { data: staffList, error } = await query;

    if (error) {
      throw error;
    }

    return successResponse(staffList || []);
  } catch (err) {
    return handleApiError(err);
  }
}
