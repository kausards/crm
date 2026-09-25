-- =========================================================================
-- Migration: 002_auth_trigger.sql
-- Description: Trigger to auto-create profile when user is created in Supabase Auth
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
  v_role text;
  v_full_name text;
begin
  v_tenant_id := coalesce(
    (new.raw_app_meta_data ->> 'tenant_id')::uuid,
    (new.raw_user_meta_data ->> 'tenant_id')::uuid
  );
  v_role := coalesce(
    new.raw_app_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'role',
    'owner'
  );
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );

  if v_tenant_id is not null then
    insert into public.profiles (id, tenant_id, role, full_name, email)
    values (new.id, v_tenant_id, v_role, v_full_name, new.email)
    on conflict (id) do update
      set tenant_id = excluded.tenant_id,
          role = excluded.role,
          full_name = excluded.full_name;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
