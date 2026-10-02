import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';
import { timingSafeCompare } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { masterKey, email, password } = body;

    const expectedSecret = process.env.SUPER_ADMIN_SECRET;
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();

    // 1. Verify via Master Developer Key
    if (masterKey) {
      if (!expectedSecret) {
        return errorResponse('FORBIDDEN', 'Super Admin secret is not configured on the server', 403);
      }

      if (timingSafeCompare(masterKey.trim(), expectedSecret)) {
        const response = successResponse({
          authenticated: true,
          method: 'master_key',
          user: {
            email: superAdminEmail || 'admin@nexusflow.internal',
            fullName: 'Master SaaS Developer',
            role: 'super_admin',
            isSuperAdmin: true,
          },
        });

        // Set secure cookie for admin session
        response.cookies.set('saas_admin_auth', expectedSecret, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
      } else {
        return errorResponse('UNAUTHORIZED', 'Invalid Master Developer Secret Key', 401);
      }
    }

    // 2. Verify via Developer Email & Password
    if (email && password) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        return errorResponse('UNAUTHORIZED', error?.message || 'Invalid credentials', 401);
      }

      const userEmail = (data.user.email || '').toLowerCase().trim();
      const superAdminId = process.env.SUPER_ADMIN_USER_ID;

      const isSuper = (Boolean(superAdminId) && data.user.id === superAdminId) ||
                      (Boolean(superAdminEmail) && userEmail === superAdminEmail) ||
                      data.user.app_metadata?.is_super_admin === true;

      if (!isSuper) {
        return errorResponse('FORBIDDEN', 'This account is not designated as SaaS Platform Super Admin', 403);
      }

      const response = successResponse({
        authenticated: true,
        method: 'supabase_auth',
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || 'Master SaaS Developer',
          role: 'super_admin',
          isSuperAdmin: true,
        },
      });

      if (expectedSecret) {
        response.cookies.set('saas_admin_auth', expectedSecret, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      }

      return response;
    }

    return errorResponse('BAD_REQUEST', 'Please provide either masterKey or email & password', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
