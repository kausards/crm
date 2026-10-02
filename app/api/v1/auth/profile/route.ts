import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth();
    const supabase = await createClient();

    const [profileRes, tenantRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.userId).maybeSingle(),
      supabase.from('tenants').select('*').eq('id', auth.tenantId).maybeSingle(),
    ]);

    return successResponse({
      profile: {
        id: auth.userId,
        email: auth.email || profileRes.data?.email || null,
        full_name: profileRes.data?.full_name || auth.fullName || 'Merchant',
        role: profileRes.data?.role || auth.role,
        tenant_id: auth.tenantId,
        business_name: tenantRes.data?.business_name || 'NexusFlow Store',
        plan: tenantRes.data?.plan || 'pro',
        subscription_status: tenantRes.data?.subscription_status || 'active',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const supabase = await createClient();

    const { full_name, business_name } = body;

    // Update profile table
    if (full_name !== undefined) {
      const cleanName = String(full_name).trim();
      if (!cleanName) {
        return errorResponse('BAD_REQUEST', 'Full name cannot be empty', 400);
      }

      await supabase
        .from('profiles')
        .update({ full_name: cleanName })
        .eq('id', auth.userId);

      // Attempt Supabase auth metadata update if live session exists
      try {
        await supabase.auth.updateUser({
          data: { full_name: cleanName },
        });
      } catch {
        // Ignored for guest or non-session auth
      }
    }

    // Update business_name in tenants table if owner
    if (business_name !== undefined) {
      if (auth.role !== 'owner') {
        return errorResponse('FORBIDDEN', 'Only store owners can modify the business name', 403);
      }

      const cleanBizName = String(business_name).trim();
      if (!cleanBizName) {
        return errorResponse('BAD_REQUEST', 'Business name cannot be empty', 400);
      }

      await supabase
        .from('tenants')
        .update({ business_name: cleanBizName })
        .eq('id', auth.tenantId);
    }

    // Return updated composite record
    const [profileRes, tenantRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', auth.userId).maybeSingle(),
      supabase.from('tenants').select('*').eq('id', auth.tenantId).maybeSingle(),
    ]);

    return successResponse({
      profile: {
        id: auth.userId,
        email: auth.email || profileRes.data?.email || null,
        full_name: profileRes.data?.full_name || full_name || auth.fullName,
        role: profileRes.data?.role || auth.role,
        tenant_id: auth.tenantId,
        business_name: tenantRes.data?.business_name || business_name || 'NexusFlow Store',
        plan: tenantRes.data?.plan || 'pro',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = PATCH;
