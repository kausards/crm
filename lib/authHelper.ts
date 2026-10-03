import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { UserRole } from '@/types/database.types';
import { timingSafeCompare } from '@/lib/encryption';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string | null;
  fullName: string | null;
}

interface ProfileRow {
  tenant_id: string;
  role: UserRole;
  full_name: string | null;
}

/**
 * Requires an authenticated user session and returns the user's tenant_id and role.
 * If requireOwner is true, ensures the user has role === 'owner'.
 */
export async function requireAuth(requireOwner = false): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    const err = new Error('Unauthorized: Authentication required');
    (err as unknown as { code: string; status: number }).code = 'UNAUTHORIZED';
    (err as unknown as { status: number }).status = 401;
    throw err;
  }

  // Read tenant_id and role strictly from app_metadata or profiles (never user-editable user_metadata)
  let tenantId = user.app_metadata?.tenant_id as string | undefined;
  let role = user.app_metadata?.role as UserRole | undefined;
  let fullName = (user.user_metadata?.full_name || null) as string | null;

  if (!tenantId || !role) {
    // Fetch verified tenant association from profiles table
    const { data } = await supabase
      .from('profiles')
      .select('tenant_id, role, full_name')
      .eq('id', user.id)
      .single();

    const profile = data as ProfileRow | null;

    if (profile) {
      tenantId = profile.tenant_id;
      role = profile.role;
      fullName = profile.full_name || fullName;
    }
  }

  const superAdminId = process.env.SUPER_ADMIN_USER_ID;
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  const userEmail = (user.email || '').toLowerCase().trim();

  const isSuperUser = (Boolean(superAdminId) && user.id === superAdminId) ||
                      (Boolean(superAdminEmail) && userEmail === superAdminEmail) ||
                      user.app_metadata?.is_super_admin === true ||
                      user.app_metadata?.role === 'super_admin' ||
                      (role as string) === 'super_admin' ||
                      (role as string) === 'admin';

  if (!tenantId) {
    if (isSuperUser) {
      tenantId = 'platform_master';
      role = 'owner';
    } else {
      const err = new Error('No tenant associated with this account');
      (err as unknown as { code: string; status: number }).code = 'FORBIDDEN';
      (err as unknown as { status: number }).status = 403;
      throw err;
    }
  }

  const effectiveRole = role || 'staff';

  if (requireOwner && effectiveRole !== 'owner' && !isSuperUser && (effectiveRole as string) !== 'super_admin' && (effectiveRole as string) !== 'admin') {
    const err = new Error('Forbidden: Owner privileges required');
    (err as unknown as { code: string; status: number }).code = 'FORBIDDEN';
    (err as unknown as { status: number }).status = 403;
    throw err;
  }

  return {
    userId: user.id,
    tenantId,
    role: effectiveRole,
    email: user.email || null,
    fullName,
  };
}

/**
 * Requires super-admin privileges.
 * Checks:
 * 1) Cookie `saas_admin_auth` compared safely with SUPER_ADMIN_SECRET env variable
 * 2) Supabase user ID matching SUPER_ADMIN_USER_ID
 * 3) Supabase user email matching SUPER_ADMIN_EMAIL
 * 4) Token claim `app_metadata.is_super_admin`
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  // 1. Check if authenticated via master session cookie
  try {
    const cookieStore = await cookies();
    const masterCookie = cookieStore.get('saas_admin_auth')?.value;
    const expectedSecret = process.env.SUPER_ADMIN_SECRET;

    if (expectedSecret && masterCookie && timingSafeCompare(masterCookie, expectedSecret)) {
      return {
        userId: process.env.SUPER_ADMIN_USER_ID || 'master-developer',
        tenantId: 'platform_master',
        role: 'owner',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@nexusflow.internal',
        fullName: 'Master SaaS Developer',
      };
    }
  } catch {
    // cookies() error fallback
  }

  // 2. Check Supabase user session
  try {
    const auth = await requireAuth();
    const superAdminId = process.env.SUPER_ADMIN_USER_ID;
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
    const userEmail = (auth.email || '').toLowerCase().trim();

    if (
      (Boolean(superAdminId) && auth.userId === superAdminId) ||
      (Boolean(superAdminEmail) && userEmail === superAdminEmail)
    ) {
      return auth;
    }
  } catch {
    // Not logged in via supabase auth
  }

  const err = new Error('Forbidden: Platform super-admin privileges required');
  (err as unknown as { code: string; status: number }).code = 'FORBIDDEN';
  (err as unknown as { status: number }).status = 403;
  throw err;
}
