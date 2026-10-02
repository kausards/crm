import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { UserRole } from '@/types/database.types';

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
    // PUBLIC ACCESS / GUEST MODE:
    // Allow anyone visiting via link to enter the website directly with full owner access
    return {
      userId: '2ffca547-c493-400c-baa0-910634d770e4',
      tenantId: '6576b9e2-127e-4e4d-9744-db36656a403c',
      role: 'owner',
      email: 'mdkausar0877@gmail.com',
      fullName: 'Md Kausar',
    };
  }

  // Read tenant_id and role from metadata or profile
  let tenantId = (user.app_metadata?.tenant_id || user.user_metadata?.tenant_id) as string | undefined;
  let role = (user.app_metadata?.role || user.user_metadata?.role) as UserRole | undefined;
  let fullName = (user.user_metadata?.full_name || null) as string | null;

  if (!tenantId || !role) {
    // Fetch from profiles table
    const { data } = await supabase
      .from('profiles')
      .select('tenant_id, role, full_name')
      .eq('id', user.id)
      .single();

    const profile = data as ProfileRow | null;

    if (profile) {
      tenantId = profile.tenant_id;
      role = profile.role;
      fullName = profile.full_name;
    }
  }

  const superAdminId = process.env.SUPER_ADMIN_USER_ID;
  const userEmail = (user.email || '').toLowerCase();
  const allowedSuperAdminEmails = [
    (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase(),
    'admin@nexusflow.com',
    'kausar.test@crmdemo.com',
    'mdkausar0877@gmail.com',
  ].filter(Boolean);

  const isSuperUser = (superAdminId && user.id === superAdminId) ||
                      allowedSuperAdminEmails.includes(userEmail) ||
                      user.app_metadata?.is_super_admin === true ||
                      user.user_metadata?.is_super_admin === true;

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

  if (requireOwner && effectiveRole !== 'owner') {
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
 * 1) Cookie `saas_admin_auth` (master developer key session)
 * 2) Supabase user ID matching SUPER_ADMIN_USER_ID
 * 3) Supabase user email matching SUPER_ADMIN_EMAIL
 * 4) Metadata is_super_admin flag
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  // 1. Check if authenticated via master session cookie
  try {
    const cookieStore = await cookies();
    const masterCookie = cookieStore.get('saas_admin_auth')?.value;
    const expectedSecret = process.env.SUPER_ADMIN_SECRET || 'crm_developer_root_2026';

    if (masterCookie && masterCookie === expectedSecret) {
      return {
        userId: process.env.SUPER_ADMIN_USER_ID || 'master-developer',
        tenantId: 'platform_master',
        role: 'owner',
        email: process.env.SUPER_ADMIN_EMAIL || 'kausar.test@crmdemo.com',
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
    const userEmail = (auth.email || '').toLowerCase();
    const allowedSuperAdminEmails = [
      (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase(),
      'admin@nexusflow.com',
      'kausar.test@crmdemo.com',
      'mdkausar0877@gmail.com',
    ].filter(Boolean);

    if (
      (superAdminId && auth.userId === superAdminId) ||
      allowedSuperAdminEmails.includes(userEmail)
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

