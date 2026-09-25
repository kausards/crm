-- =========================================================================
-- Migration: 003_recurring_costs_cron.sql
-- Description: pg_cron scheduled job for recurring monthly costs
-- =========================================================================

-- Optional pg_cron setup in Supabase Postgres:
-- Runs on the 1st of every month at midnight (00:00 UTC)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'auto-apply-monthly-costs',
      '0 0 1 * *',
      $$
        insert into public.bill_costs (tenant_id, name, amount, date, category, is_recurring, frequency)
        select 
          tenant_id, 
          name, 
          amount, 
          current_date, 
          category, 
          false, 
          null
        from public.bill_costs
        where is_recurring = true 
          and frequency = 'monthly'
          and not exists (
            select 1 from public.bill_costs existing
            where existing.tenant_id = bill_costs.tenant_id
              and existing.name = bill_costs.name
              and existing.date = current_date
          );
      $$
    );
  end if;
end $$;
