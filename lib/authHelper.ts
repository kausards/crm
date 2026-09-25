import { createClient } from '@/lib/supabase/server';
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
    const err = new Error('Unauthorized');
    (err as unknown as { code: string; status: number }).code = 'UNAUTHORIZED';
    (err as unknown as { status: number }).status = 401;
    throw err;
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

  if (!tenantId) {
    const err = new Error('No tenant associated with this account');
    (err as unknown as { code: string; status: number }).code = 'FORBIDDEN';
    (err as unknown as { status: number }).status = 403;
    throw err;
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
