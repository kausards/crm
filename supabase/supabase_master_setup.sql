-- =========================================================================
-- CRM PLATFORM - MASTER DATABASE SETUP
-- Project Ref: zqpvreqiykymmodtthed
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zqpvreqiykymmodtthed/sql
-- =========================================================================

-- 1. Helper function to extract tenant_id from caller's JWT custom claims
create or replace function auth.tenant_id() returns uuid as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid,
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );
$$ language sql stable security definer set search_path = public;

-- Helper to check if current user is owner
create or replace function auth.is_owner() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and tenant_id = auth.tenant_id()
      and role = 'owner'
  );
$$ language sql stable security definer set search_path = public;

-- 2. Tenants table (one per subscribed store/business)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  plan text not null default 'trial' check (plan in ('trial', 'basic', 'pro')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'expired', 'cancelled')),
  created_at timestamptz default now()
);

-- 3. Profiles table (extends auth.users with tenant_id and role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  full_name text,
  email text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_tenant_select" on public.profiles;
create policy "profiles_tenant_select" on public.profiles
  for select using (tenant_id = auth.tenant_id());

drop policy if exists "profiles_tenant_write" on public.profiles;
create policy "profiles_tenant_write" on public.profiles
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

-- 4. Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sku text,
  buy_price numeric(12,2) not null check (buy_price >= 0),
  sell_price numeric(12,2) not null check (sell_price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  is_active bool not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products enable row level security;

drop policy if exists "products_tenant_select" on public.products;
create policy "products_tenant_select" on public.products
  for select using (tenant_id = auth.tenant_id());

drop policy if exists "products_tenant_write" on public.products;
create policy "products_tenant_write" on public.products
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

create index if not exists idx_products_tenant on public.products(tenant_id);
create index if not exists idx_products_active on public.products(tenant_id, is_active);

-- 5. Stock movements (complete immutable ledger of stock changes)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  quantity int not null check (quantity > 0),
  reason text not null, -- 'order_confirm', 'order_cancel', 'order_return', 'manual_adjust', 'opening_balance'
  reference_id uuid,
  created_at timestamptz default now()
);
alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements_tenant" on public.stock_movements;
create policy "stock_movements_tenant" on public.stock_movements
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

create index if not exists idx_stock_movements_prod on public.stock_movements(tenant_id, product_id);

-- 6. Order Status Enum & Orders Table
do $$ begin
  create type order_status as enum (
    'pending', 'flagged', 'confirmed', 'on_hold',
    'packed', 'shipped', 'delivered', 'returned', 'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  status order_status not null default 'pending',
  total_amount numeric(12,2) not null check (total_amount >= 0),
  cod_amount numeric(12,2) not null check (cod_amount >= 0),
  delivery_charge numeric(12,2) not null default 0 check (delivery_charge >= 0),
  notes text,
  is_flagged bool not null default false,
  flag_reason text,
  courier_provider text check (courier_provider in ('steadfast', 'pathao', 'redx') or courier_provider is null),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.orders enable row level security;

drop policy if exists "orders_tenant_all" on public.orders;
create policy "orders_tenant_all" on public.orders
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

create index if not exists idx_orders_tenant_status on public.orders(tenant_id, status);
create index if not exists idx_orders_phone on public.orders(tenant_id, customer_phone);

-- 7. Order Items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  buy_price numeric(12,2) not null check (buy_price >= 0),
  sell_price numeric(12,2) not null check (sell_price >= 0)
);
alter table public.order_items enable row level security;

drop policy if exists "order_items_tenant_all" on public.order_items;
create policy "order_items_tenant_all" on public.order_items
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

create index if not exists idx_order_items_order on public.order_items(order_id);

-- 8. Courier Credentials (per-tenant, AES-256-GCM encrypted) - OWNER ONLY
create table if not exists public.courier_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('steadfast', 'pathao', 'redx')),
  encrypted_api_key text not null,
  encrypted_api_secret text,
  is_active bool not null default true,
  created_at timestamptz default now(),
  unique(tenant_id, provider)
);
alter table public.courier_credentials enable row level security;

drop policy if exists "courier_creds_owner_only" on public.courier_credentials;
create policy "courier_creds_owner_only" on public.courier_credentials
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

-- 9. Courier Shipments
create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  consignment_id text not null,
  tracking_code text,
  status text not null default 'created',
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
alter table public.courier_shipments enable row level security;

drop policy if exists "courier_shipments_tenant" on public.courier_shipments;
create policy "courier_shipments_tenant" on public.courier_shipments
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());

create index if not exists idx_shipments_order on public.courier_shipments(order_id);
create index if not exists idx_shipments_consignment on public.courier_shipments(provider, consignment_id);

-- 10. Bill / Costs - OWNER ONLY
create table if not exists public.bill_costs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  date date not null,
  is_recurring bool not null default false,
  frequency text check (frequency in ('daily', 'monthly') or frequency is null),
  category text, -- 'return_cost', 'rent', 'marketing', 'office', 'other'
  created_at timestamptz default now()
);
alter table public.bill_costs enable row level security;

drop policy if exists "bill_costs_owner_only" on public.bill_costs;
create policy "bill_costs_owner_only" on public.bill_costs
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

-- 11. Employees & Payroll - OWNER ONLY
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  monthly_salary numeric(12,2) not null check (monthly_salary >= 0),
  salary_divisor int not null default 30 check (salary_divisor between 1 and 365),
  joined_at date,
  is_active bool not null default true,
  created_at timestamptz default now()
);
alter table public.employees enable row level security;

drop policy if exists "employees_owner_only" on public.employees;
create policy "employees_owner_only" on public.employees
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'half')),
  unique(employee_id, date)
);
alter table public.attendance enable row level security;

drop policy if exists "attendance_owner_only" on public.attendance;
create policy "attendance_owner_only" on public.attendance
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

create table if not exists public.salary_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month date not null,
  days_present int not null check (days_present >= 0),
  days_absent int not null check (days_absent >= 0),
  gross_salary numeric(12,2) not null check (gross_salary >= 0),
  deduction numeric(12,2) not null default 0 check (deduction >= 0),
  net_payable numeric(12,2) not null check (net_payable >= 0),
  manual_override numeric(12,2) check (manual_override is null or manual_override >= 0),
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table public.salary_runs enable row level security;

drop policy if exists "salary_runs_owner_only" on public.salary_runs;
create policy "salary_runs_owner_only" on public.salary_runs
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

-- 12. Due Ledger (receivable) & Loan Ledger (payable) - OWNER ONLY
create table if not exists public.due_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  party_name text not null,
  party_phone text,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz default now()
);
alter table public.due_ledger enable row level security;

drop policy if exists "due_ledger_owner_only" on public.due_ledger;
create policy "due_ledger_owner_only" on public.due_ledger
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

create table if not exists public.loan_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  party_name text not null,
  party_phone text,
  type text not null check (type in ('borrowed', 'repaid')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz default now()
);
alter table public.loan_ledger enable row level security;

drop policy if exists "loan_ledger_owner_only" on public.loan_ledger;
create policy "loan_ledger_owner_only" on public.loan_ledger
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

-- 13. Opening Balances (onboarding baseline) - OWNER ONLY
create table if not exists public.opening_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  total_stock_value numeric(12,2) not null default 0,
  total_receivable numeric(12,2) not null default 0,
  total_payable numeric(12,2) not null default 0,
  set_at timestamptz default now()
);
alter table public.opening_balances enable row level security;

drop policy if exists "opening_balances_owner_only" on public.opening_balances;
create policy "opening_balances_owner_only" on public.opening_balances
  for all using (
    tenant_id = auth.tenant_id() and auth.is_owner()
  ) with check (
    tenant_id = auth.tenant_id() and auth.is_owner()
  );

-- 14. Subscriptions (Platform Level, Managed via Service Role)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  sslcommerz_transaction_id text,
  amount numeric(12,2),
  renewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_tenant_select" on public.subscriptions;
create policy "subscriptions_tenant_select" on public.subscriptions
  for select using (tenant_id = auth.tenant_id());

-- 15. User creation trigger function
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
