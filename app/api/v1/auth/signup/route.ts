import { NextRequest } from 'next/server';
import { signupSchema } from '@/lib/validators/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { authLimiter, getClientIp } from '@/lib/rateLimit';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitCheck = await authLimiter.limit(`signup_${ip}`);
    if (!limitCheck.success) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.', 429);
    }

    const body = await req.json();
    const validated = signupSchema.parse(body);

    // 1. Create tenant row
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name: validated.businessName,
        plan: 'trial',
        subscription_status: 'active',
      })
      .select('id, business_name')
      .single();

    if (tenantErr || !tenant) {
      return errorResponse('INTERNAL_ERROR', `Failed to create business tenant: ${tenantErr?.message}`, 500);
    }

    // 2. Create user in Supabase Auth with custom claims
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        full_name: validated.fullName,
        tenant_id: tenant.id,
        role: 'owner',
      },
      app_metadata: {
        tenant_id: tenant.id,
        role: 'owner',
      },
    });

    if (authErr || !authData.user) {
      // Rollback tenant
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return errorResponse('BAD_REQUEST', authErr?.message || 'Failed to create user account', 400);
    }

    // 3. Link owner to tenant
    await supabaseAdmin
      .from('tenants')
      .update({ owner_id: authData.user.id })
      .eq('id', tenant.id);

    // 4. Ensure profile row exists
    await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      tenant_id: tenant.id,
      role: 'owner',
      full_name: validated.fullName,
      email: validated.email,
    });

    // 5. Sign user in using server client to set auth session cookies
    const supabase = await createClient();
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (signInErr) {
      return successResponse({
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName: validated.fullName,
          role: 'owner',
          tenantId: tenant.id,
          businessName: tenant.business_name,
        },
        requiresLogin: true,
      }, 201);
    }

    return successResponse({
      user: {
        id: signInData.user.id,
        email: signInData.user.email,
        fullName: validated.fullName,
        role: 'owner',
        tenantId: tenant.id,
        businessName: tenant.business_name,
      },
      session: {
        expiresAt: signInData.session?.expires_at,
      },
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
