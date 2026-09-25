// Supabase Edge Function: recurring-costs
// Triggered on the 1st of every month via pg_cron or Vercel Cron
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const currentDateStr = today.toISOString().slice(0, 10);

    // 1. Fetch recurring monthly bill costs
    const { data: recurringCosts, error } = await supabase
      .from('bill_costs')
      .select('*')
      .eq('is_recurring', true)
      .eq('frequency', 'monthly');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    let createdCount = 0;

    for (const cost of recurringCosts || []) {
      // Check if already created for this month to avoid duplicates
      const { data: existing } = await supabase
        .from('bill_costs')
        .select('id')
        .eq('tenant_id', cost.tenant_id)
        .eq('name', cost.name)
        .eq('date', currentDateStr)
        .single();

      if (!existing) {
        await supabase.from('bill_costs').insert({
          tenant_id: cost.tenant_id,
          name: cost.name,
          amount: cost.amount,
          date: currentDateStr,
          category: cost.category,
          is_recurring: false, // auto-generated instances are standard log items
          frequency: null,
        });
        createdCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: recurringCosts?.length || 0, created: createdCount }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
