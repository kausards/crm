import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY: Never import or use this client in client components or browser bundles.
// Bypasses Row Level Security (RLS) for platform admin, automated crons, and third-party webhooks.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zqpvreqiykymmodtthed.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcHZyZXFpeWt5bW1vZHR0aGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDMyODIsImV4cCI6MjEwNTkxOTI4Mn0.EC2kkl8dFjoT3Cceg1TOP8FZaQhh_hzijNhkXoaBZZc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: SupabaseClient<any, 'public', any> = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
