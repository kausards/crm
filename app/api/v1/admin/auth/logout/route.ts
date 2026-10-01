import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse } from '@/lib/apiResponse';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore signout error if session already expired
  }

  const response = successResponse({ message: 'Admin logged out successfully' });
  response.cookies.delete('saas_admin_auth');
  return response;
}
