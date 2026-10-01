import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<Database, any, any>;

export interface RecurringCostResult {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Deterministically applies monthly recurring bill/costs for all active templates
 * Ensures idempotency: will not insert duplicate records for the same (tenant_id, name, date).
 */
export async function applyRecurringCosts(
  supabase: Client,
  dateStr?: string
): Promise<RecurringCostResult> {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);

  // Fetch recurring monthly bill costs
  const { data: recurringCosts, error } = await supabase
    .from('bill_costs')
    .select('*')
    .eq('is_recurring', true)
    .eq('frequency', 'monthly');

  if (error) {
    throw new Error(`Failed to fetch recurring costs: ${error.message}`);
  }

  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const cost of recurringCosts || []) {
    try {
      // Check if already created for this target date
      const { data: existing, error: existErr } = await supabase
        .from('bill_costs')
        .select('id')
        .eq('tenant_id', cost.tenant_id)
        .eq('name', cost.name)
        .eq('date', targetDate)
        .maybeSingle();

      if (existErr) {
        errors.push(`Error checking duplicate for ${cost.name}: ${existErr.message}`);
        continue;
      }

      if (!existing) {
        const { error: insertErr } = await supabase.from('bill_costs').insert({
          tenant_id: cost.tenant_id,
          name: cost.name,
          amount: cost.amount,
          date: targetDate,
          category: cost.category,
          is_recurring: false, // auto-generated instances are standard log items
          frequency: null,
        });

        if (insertErr) {
          errors.push(`Failed to insert instance for ${cost.name}: ${insertErr.message}`);
        } else {
          createdCount++;
        }
      } else {
        skippedCount++;
      }
    } catch (err: unknown) {
      errors.push(`Unexpected error processing ${cost.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    processed: recurringCosts?.length || 0,
    created: createdCount,
    skipped: skippedCount,
    errors,
  };
}
