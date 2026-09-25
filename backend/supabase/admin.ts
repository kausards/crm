import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY: Never import or use this client in client components or browser bundles.
// Bypasses Row Level Security (RLS) for platform admin, automated crons, and third-party webhooks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: SupabaseClient<any, 'public', any> = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
