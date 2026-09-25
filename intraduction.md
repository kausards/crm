# Project Blueprint — Inventory & Accounts SaaS (BD Market)

### Next.js + TypeScript + Supabase — Multi-Tenant

> **Version:** 1.0
> **Document snapshot:** Practices are maintained over time — dependency numbers in this file are **not** authoritative.
> **Audience:** Solo founder (Kausar), AI coding assistants (Antigravity IDE, Claude)
> **Purpose:** Copy-paste prompts, security checklists, folder structure, DB/RLS patterns, and API documentation standard for building this specific product — the multi-tenant Inventory + Order + Courier + Accounts SaaS discussed and scoped across this conversation.

---

## 0. Adaptation Note — why this isn't MERN

The reference blueprint you shared assumes **MongoDB + Express + Mongoose + React/Vite**. This version is adapted to **Supabase (Postgres) + Next.js + Vercel**, because:

- That's already your working stack on **Growthomic** — no new stack to learn, no new IDE workflow.
- Postgres gives you **Row Level Security (RLS)** — the correct primitive for true multi-tenant isolation (stronger than an app-level "belongs to this user" check alone).
- Next.js API Routes / Route Handlers replace Express — same REST endpoint shape, no separate backend process to deploy.
- The **hard lesson from Growthomic still applies, unchanged, and matters MORE here**: money/stock-critical logic must never depend on LLM output — deterministic SQL/server logic only. AI (if used at all) is for reporting summaries, never the ledger or stock math.

Everything else in the reference blueprint — the security checklist mindset, API doc standard, git/AI hygiene, master-prompt structure — is preserved and adapted below.

---

## ⚠️ Version Safety Rule (Read First)

> **Never copy version numbers from this document (or from memory) into `package.json`.** Old pins stay vulnerable; docs go stale the day they ship.

**Before writing or editing `package.json`:**

1. Web search each non-trivial dependency: `"<package> npm latest version"`, `"<package> CVE"` / security advisory.
2. Cross-check with `npm show <package> version` in the terminal.
3. If an advisory exists on `latest`, search for the patched version or an alternative package.
4. State what you verified before installing — don't silently invent a version.
5. Use `^` ranges unless you have a documented reason to pin exact.

| Package (verify each) | What to check |
|---|---|
| `next`, `react`, `react-dom` | Latest stable major; Next.js/React compatibility |
| `@supabase/supabase-js`, `@supabase/ssr` | Latest stable; breaking changes between majors are common |
| `zod` | Latest stable; note betas |
| `exceljs` | Latest stable; advisory check |
| `@upstash/ratelimit`, `@upstash/redis` | Latest stable |
| `bcryptjs` (only if not using Supabase Auth's built-in hashing) | Latest stable |
| `resend` or `nodemailer` | Latest stable |
| `@sentry/nextjs` | Latest stable + Sentry docs for Next.js App Router setup |

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Repository Structure](#2-repository-structure)
3. [Environment Variables](#3-environment-variables)
4. [Multi-Tenant & Database Architecture](#4-multi-tenant--database-architecture)
5. [Core Domain Modules](#5-core-domain-modules)
6. [API Documentation Standard](#6-api-documentation-standard)
7. [Backend Security Checklist](#7-backend-security-checklist)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Frontend Security Checklist](#9-frontend-security-checklist)
10. [AI Workflow, CI & Git Hygiene](#10-ai-workflow-ci--git-hygiene)
11. [Testing Guide](#11-testing-guide)
12. [Master Prompt (Antigravity Bootstrap)](#12-master-prompt-antigravity-bootstrap)
13. [Explicitly Out of Scope (v1)](#13-explicitly-out-of-scope-v1)
14. [Document Maintenance](#14-document-maintenance)

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | Next.js (App Router) + TypeScript | Full-stack in one app — API Routes replace Express |
| **Hosting** | Vercel | Same as Growthomic |
| **Database** | Supabase Postgres | Multi-tenant via RLS |
| **DB Client** | `@supabase/supabase-js` + generated TS types | `supabase gen types typescript` after every schema change |
| **Auth** | Supabase Auth (email/password + Google OAuth) | `profiles` table extends `auth.users` with `tenant_id` + `role` |
| **Validation** | Zod | Env vars + all API request bodies |
| **Multi-tenancy enforcement** | Postgres RLS policies | Every tenant-scoped table filters by `tenant_id = auth.jwt() -> tenant_id` (see §4) |
| **Courier APIs** | Steadfast, Pathao, RedX (direct REST) | Credentials stored **per-tenant, encrypted**, not in `.env` |
| **Subscription billing** | SSLCommerz (bKash/Nagad/card aggregator) | BD-standard for SaaS subscription collection |
| **Encryption** | Node `crypto` — AES-256-GCM | For courier credentials + any stored payment tokens |
| **Scheduled jobs** | Supabase Edge Functions + `pg_cron`, or Vercel Cron | Recurring cost auto-apply, monthly salary run, low-stock/due-date checks |
| **Real-time** | Supabase Realtime (Postgres change feed) | Order status updates on dashboard, no Socket.io needed |
| **Spreadsheet export** | `exceljs` | Server-side `.xlsx` generation, streamed as download |
| **Email** | Resend (or Nodemailer/SMTP) | Staff invite, password reset, subscription receipts |
| **Rate limiting** | `@upstash/ratelimit` + Upstash Redis | Works on Vercel's serverless/edge runtime |
| **Monitoring** | `@sentry/nextjs` | Error tracking, scrub sensitive fields in `beforeSend` |
| **Server state (frontend)** | TanStack Query | Caching + retries |
| **Forms** | React Hook Form + Zod | Validated forms |
| **UI** | Tailwind CSS + shadcn/ui | Fast, consistent components |
| **Implementation** | Antigravity IDE | Same workflow as Growthomic — you diagnose/prompt via Claude, Antigravity implements |

**Token/session standard:** Rely on Supabase Auth's session (JWT access token, short-lived, auto-refreshed by `@supabase/ssr`). No custom JWT signing needed unless you later add a public API for third-party integrations.

---

## 2. Repository Structure

```
inventory-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx              # Tenant onboarding entry point
│   │   └── onboarding/page.tsx          # Business profile + Opening Balance wizard
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # RequireAuth + role-aware nav
│   │   ├── page.tsx                     # Home dashboard (today's sale/profit/due/low-stock)
│   │   ├── products/
│   │   ├── orders/
│   │   ├── accounts/
│   │   │   ├── pnl/
│   │   │   ├── bill-cost/
│   │   │   ├── salary/
│   │   │   └── due-loan/
│   │   └── settings/
│   │       ├── courier/                 # Per-tenant courier API key setup
│   │       └── staff/                   # Staff invite + role management
│   ├── (admin)/                         # Super-admin panel (Kausar only)
│   │   └── tenants/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── products/route.ts
│   │   │   ├── products/[id]/pnl/route.ts
│   │   │   ├── orders/route.ts
│   │   │   ├── orders/[id]/confirm/route.ts     # Triggers courier consignment
│   │   │   ├── orders/[id]/hold/route.ts
│   │   │   ├── orders/[id]/cancel/route.ts
│   │   │   ├── courier/webhook/[provider]/route.ts  # Steadfast/Pathao/RedX status callbacks
│   │   │   ├── bill-cost/route.ts
│   │   │   ├── salary/[employeeId]/attendance/route.ts
│   │   │   ├── due-loan/route.ts
│   │   │   ├── export/monthly/route.ts          # Full Excel workbook export
│   │   │   └── billing/webhook/route.ts         # SSLCommerz subscription callback
│   │   └── health/route.ts
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── server.ts                    # Server-side client (RLS-aware, cookies)
│   │   ├── client.ts                    # Browser client
│   │   └── admin.ts                     # Service-role client — server-only, bypasses RLS, used sparingly (super-admin panel, webhooks)
│   ├── env.ts                           # Zod-validated env
│   ├── encryption.ts                    # AES-256-GCM encrypt/decrypt for courier creds
│   ├── courier/
│   │   ├── steadfast.ts
│   │   ├── pathao.ts
│   │   └── redx.ts
│   ├── accounting/
│   │   ├── pnl.ts                       # Deterministic profit/loss calculations
│   │   ├── salary.ts                    # Attendance → payable calculation
│   │   └── recurringCost.ts             # Monthly auto-apply logic
│   └── validators/                      # Zod schemas per resource
├── supabase/
│   ├── migrations/                      # SQL migrations (schema + RLS policies)
│   └── functions/                       # Edge Functions (cron jobs, webhooks)
├── types/
│   └── database.types.ts                # `supabase gen types typescript` output
├── .env.example
├── .gitignore
├── .cursorignore
├── package.json
└── tsconfig.json                        # strict mode required
```

**Rules — never break these:**

- Never commit `.env`, `node_modules`, `.next/`, or `dist/`
- Always commit `.env.example` with placeholder values and comments
- One source of truth for env validation: `lib/env.ts`
- TypeScript strict mode always on — no `any` unless explicitly typed and commented
- `types/database.types.ts` is regenerated after every migration — never hand-edited

### `.gitignore`

```gitignore
# Dependencies
node_modules/

# Next.js
.next/
out/

# Environment & secrets — NEVER commit (only .env.example is allowed)
.env
.env.*
!.env.example

# Private keys
*.pem
*.key

# Logs & coverage
*.log
coverage/

# OS / editor noise
.DS_Store
```

---

## 3. Environment Variables

### `.env.example`

```env
# ── App ─────────────────────────────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Supabase ────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-only, bypasses RLS — never exposed to client

# ── Encryption (per-tenant courier/payment credentials at rest) ────────
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=replace_with_64_char_hex

# ── Subscription billing (SSLCommerz) ──────────────────────────────────
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_IS_SANDBOX=true

# ── Email (Resend or SMTP) ──────────────────────────────────────────────
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# ── Rate limiting (Upstash) ─────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# ── Monitoring ────────────────────────────────────────────────────────────
SENTRY_DSN=https://your_sentry_dsn_here
```

> **Important difference from the generic blueprint:** Steadfast/Pathao/RedX API credentials are **NOT** environment variables — this is a multi-tenant app, and each tenant connects their own courier account. Store them **per-tenant, encrypted at rest** in a `courier_credentials` table (§4), decrypted server-side only when calling the courier API.

### Env Validation Pattern

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ENCRYPTION_KEY: z.string().length(64),
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

---

## 4. Multi-Tenant & Database Architecture

### 4.1 RLS pattern (the core safety mechanism)

Every tenant-scoped table carries a `tenant_id`. A helper function reads the caller's tenant from their JWT claim (set at signup/invite time), and every policy compares against it.

```sql
-- Helper: current tenant from JWT custom claim
create or replace function auth.tenant_id() returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$ language sql stable;

-- Example: products table
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  buy_price numeric not null,
  sell_price numeric not null,
  stock_quantity int not null default 0,
  low_stock_threshold int default 5,
  created_at timestamptz default now()
);

alter table products enable row level security;

create policy "tenant_isolation_select" on products
  for select using (tenant_id = auth.tenant_id());

create policy "tenant_isolation_write" on products
  for all using (tenant_id = auth.tenant_id())
  with check (tenant_id = auth.tenant_id());
```

Apply this exact pattern to **every** tenant-scoped table below. This is non-negotiable — RLS is what actually prevents one seller from ever seeing another seller's data, even if application code has a bug.

### 4.2 Role enforcement (Owner vs Staff)

```sql
-- profiles table extends auth.users
create table profiles (
  id uuid primary key references auth.users(id),
  tenant_id uuid not null references tenants(id),
  role text not null check (role in ('owner', 'staff')),
  full_name text
);

-- Example: only owners can read the accounts/finance tables
create policy "owner_only_select" on bill_costs
  for select using (
    tenant_id = auth.tenant_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
```

### 4.3 Core tables (sketch — expand per module during build)

| Table | Purpose |
|---|---|
| `tenants` | One row per subscribed business |
| `profiles` | Users, linked to `auth.users`, with `tenant_id` + `role` |
| `subscriptions` | Plan, status, SSLCommerz reference, renewal date |
| `products`, `product_variants` | Catalog, buy/sell price, stock |
| `stock_movements` | Every in/out event, for monthly movement reports |
| `orders`, `order_items` | Order header + line items, status enum, risk-flag fields |
| `courier_credentials` | Per-tenant, **encrypted** API keys per provider |
| `courier_shipments` | Consignment ID, tracking status, linked order |
| `bill_costs` | Manual cost entries, `is_recurring` flag, frequency |
| `employees`, `attendance`, `salary_runs` | Payroll module |
| `due_ledger` (customer receivable), `loan_ledger` (payable) | Party-wise running balance |
| `opening_balances` | Onboarding-time starting stock/due/loan values |

### 4.4 Order status enum

```sql
create type order_status as enum (
  'pending', 'flagged', 'confirmed', 'on_hold', 'packed',
  'shipped', 'delivered', 'returned', 'cancelled'
);
```

`flagged` is a *display state* alongside `pending` (risk-check result), never a blocking state — the order still only moves forward on manual **Confirm**.

---

## 5. Core Domain Modules

*(Full detail already scoped in `inventory-accounts-saas-spec.md` from earlier in this project — summarized here for blueprint completeness.)*

1. **Inventory & Product Management** — catalog, variants, stock in/out, low-stock alert, per-product + all-products P&L drill-down.
2. **Order Management** — manual entry + website/landing-page capture, pipeline, COD fraud/return-risk **flag-only** check against courier history, Confirm/On Hold/Cancel actions, Confirm triggers courier send.
3. **Courier Integration** — Steadfast/Pathao/RedX, per-tenant credentials, webhook status sync, auto-restock + return-cost logging on RTO.
4. **Accounts / Finance (managerial, not statutory)**
   - Product-level + overall Profit/Loss
   - Return cost tracking → feeds Gross Profit
   - Gross Profit = Revenue − COGS − Return Cost; Net/Real Profit = Gross Profit − Bill/Cost − Salary
   - Bill/Cost section — manual, custom-named, daily/monthly, **recurring template** auto-apply
   - Tax — manual line item only, no auto-calculation
   - Employee Salary — attendance-linked auto-deduction (configurable day-divisor), manual override always available
   - Due/Loan Ledger — customer receivable + loan payable, party-wise running balance
   - Excel export — per-report + full monthly workbook
5. **Dashboard & Usability** — Opening Balance onboarding step, home dashboard summary, in-app-only low-stock/due-date reminders.
6. **Multi-Tenant & Access Control** — tenant isolation via RLS, Owner/Staff roles, subscription billing (SSLCommerz), super-admin panel.

---

## 6. API Documentation Standard

Every endpoint must be documented in this format.

```
### METHOD /api/v1/<resource>/<action>

**Description:** One sentence.
**Auth required:** Yes / No
**Minimum role:** owner / staff / super-admin

#### Request
Headers:
  Authorization: Bearer <supabase-access-token>
Path params:
  :id — UUID of the resource
Body:
  { "field": "value" }

#### Response — 200 OK
  { "success": true, "data": { ... } }

#### Response — 400 Validation Error
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }

#### Business rules
  - Rule 1
  - Rule 2
```

### Error Codes Master Reference

| HTTP | Code | When to use |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod validation failed |
| 401 | `UNAUTHORIZED` | No/invalid session |
| 403 | `FORBIDDEN` | Wrong role (e.g. staff hitting an owner-only route) |
| 403 | `TENANT_MISMATCH` | Resource belongs to a different tenant (should be prevented by RLS — this code means defense-in-depth caught it) |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate unique resource |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unhandled error — check Sentry |

---

## 7. Backend Security Checklist

- [ ] RLS enabled on **every** tenant-scoped table, with both `select` and `all`/`write` policies
- [ ] Service-role Supabase client (`lib/supabase/admin.ts`) used **only** server-side, only where RLS must be bypassed (super-admin panel, courier webhooks authenticating by signature, not user session) — never shipped to the client
- [ ] Zod validation on every API route body/query/params
- [ ] Courier API credentials encrypted (AES-256-GCM) before storing; decrypted only in-memory when calling the courier API
- [ ] Courier webhook endpoints verify the provider's signature/secret — never trust an unauthenticated POST as a real delivery-status update
- [ ] Rate limiting (`@upstash/ratelimit`) on auth routes and public endpoints
- [ ] Role checks (`owner` vs `staff`) enforced **server-side** in the route handler, not just hidden in the UI
- [ ] All financial calculations (P&L, salary, gross/net profit) run in deterministic TypeScript/SQL functions — **never** generated or "corrected" by an LLM at request time
- [ ] SSLCommerz webhook signature verified before marking a subscription as paid
- [ ] `GET /api/health` implemented, excluded from rate limiting
- [ ] Sentry configured with `beforeSend` scrubbing (no tokens, no customer phone numbers in error payloads)
- [ ] `npm audit` clean before each deploy

---

## 8. Frontend Architecture

### Supabase client setup

```typescript
// lib/supabase/client.ts (browser)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts (server components / route handlers)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}
```

### TanStack Query pattern (same as reference blueprint, Supabase-backed)

```typescript
// lib/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useProducts() {
  const supabase = createClient();
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });
}
```

RLS means every query above is **automatically tenant-scoped** — no manual `tenant_id` filter needed in application code (though it's good practice to add it anyway as defense-in-depth).

---

## 9. Frontend Security Checklist

- [ ] Never call the service-role Supabase client from client components — anon key + RLS only in the browser
- [ ] Staff-role UI hides owner-only sections (accounts, salary, due/loan) — but this is convenience only; §7's server-side role check is the real gate
- [ ] All forms validated with React Hook Form + Zod before submission
- [ ] File/spreadsheet exports triggered via authenticated API route, not a client-side-only library reading raw data
- [ ] No sensitive data (courier credentials, subscription tokens) ever sent to the client in a `select('*')` — use explicit column lists on any table containing secrets

---

## 10. AI Workflow, CI & Git Hygiene

- Never paste real Supabase service-role keys, encryption keys, or courier API credentials into chat — use placeholders.
- Treat Antigravity's output as a junior developer's PR — review diffs, especially anything touching RLS policies, financial calculations, or the courier webhook handlers.
- **Confirmed pattern from Growthomic, apply here too:** never trust Antigravity's own summary of what it fixed — verify via `git log`, the actual diff, and a live Supabase query against real data.
- `.cursorignore` (or Antigravity's equivalent ignore file) should mirror `.gitignore`: `.env*`, `node_modules/`, `.next/`, any local key files.
- Minimal CI on every PR: `npm ci` → `tsc --noEmit` → `npm run lint` → `npm audit --audit-level=high`.

---

## 11. Testing Guide

Manual/Postman-equivalent run order for core flows:

```
1. Sign up → creates tenant + owner profile + triggers Opening Balance onboarding
2. Invite staff → staff logs in with limited role
3. Create product → verify stock quantity
4. Create manual order → verify fraud-flag check runs (mock courier history)
5. Confirm order → verify courier consignment created + stock deducted
6. Simulate courier webhook: delivered → verify order status updates via Realtime
7. Simulate courier webhook: returned → verify stock restored + return cost logged
8. Add a Bill/Cost entry, mark recurring → verify next month auto-applies it
9. Mark employee absent 2 days → verify salary payable recalculates
10. Add customer due + loan entries → verify combined due/payable dashboard total
11. Export monthly report → verify multi-sheet Excel file downloads correctly
12. As staff role, attempt to open /accounts/pnl → verify 403/redirect
```

---

## 12. Master Prompt (Antigravity Bootstrap)

```
Build a multi-tenant SaaS with Next.js (App Router) + TypeScript + Supabase (Postgres).

Domain: Inventory, Order & Courier-linked Accounting for Bangladeshi e-commerce sellers.

── Tenancy & Auth ──────────────────────────────────────────────────────
- Supabase Auth (email/password + Google OAuth)
- `tenants` and `profiles` tables; profiles.role in ('owner','staff'); tenant_id on profiles
- RLS enabled on every tenant-scoped table using auth.tenant_id() helper (see PROJECT_BLUEPRINT.md §4)
- Owner-only tables (bill_costs, salary tables, due/loan ledgers) get an additional role-check policy
- Onboarding wizard: business profile → Opening Balance entry (existing stock, dues, loans) → courier API connect

── Inventory ────────────────────────────────────────────────────────────
- products, product_variants tables: buy_price, sell_price, stock_quantity, low_stock_threshold
- stock_movements log for every in/out event
- Per-product drill-down endpoint returning purchased/sold/revenue/cost/profit/current stock value
- All-products combined summary endpoint

── Orders ───────────────────────────────────────────────────────────────
- Manual order entry + website/landing-page capture endpoint (public, rate-limited, validated)
- order_status enum: pending, flagged, confirmed, on_hold, packed, shipped, delivered, returned, cancelled
- On order creation: background check against courier_credentials-linked history for the phone number; set status to 'flagged' if risky — never auto-block
- Confirm/On-Hold/Cancel actions on every order; Confirm is the only action that creates a courier consignment
- Stock auto-deducts on Confirm, auto-restores on Returned/Cancelled

── Courier ──────────────────────────────────────────────────────────────
- courier_credentials table: tenant_id, provider, encrypted_api_key (AES-256-GCM via lib/encryption.ts)
- lib/courier/{steadfast,pathao,redx}.ts — createConsignment(), getStatus()
- Webhook route per provider verifying provider signature before updating courier_shipments + orders

── Accounts / Finance (deterministic — no LLM in this path) ───────────
- Product P&L (per-product + combined), computed from stock_movements + orders, never cached-and-stale
- Return cost = product cost + delivery charge lost, logged per returned order
- Gross Profit = Revenue − COGS − Return Cost; Net Profit = Gross Profit − Bill/Cost − Salary
- bill_costs table: custom name, amount, date, is_recurring, frequency; a scheduled job (Supabase Edge Function + pg_cron) auto-inserts recurring entries each period
- Tax handled only as a manual bill_costs line item — no calculation logic
- employees, attendance, salary_runs tables; per-day rate = monthly_salary / configurable_divisor (default 30); absence auto-deducts, manual override field always writable
- due_ledger (customer receivable) and loan_ledger (payable) — party-wise running balance, combined dashboard query
- Per-report Excel export (Product P&L, Bill/Cost, Salary, Due/Loan each get their own export button) PLUS /api/v1/export/monthly — exceljs-generated multi-sheet workbook (Sales, Cost, Salary, Due/Loan, Profit Summary)

── Dashboard ────────────────────────────────────────────────────────────
- Home page: today's sales, today's profit, total pending due, low-stock product count
- In-app notification/alert list for low-stock + upcoming due dates (no SMS/WhatsApp in v1)

── Billing ──────────────────────────────────────────────────────────────
- subscriptions table; SSLCommerz integration for plan payment; webhook verifies signature before activating
- Super-admin route group (/app/(admin)) restricted to a hardcoded platform-owner check, lists all tenants + plan status

── Deliverables ─────────────────────────────────────────────────────────
1. Supabase migrations (schema + RLS policies) under supabase/migrations/
2. .env.example with comments
3. .gitignore + .cursorignore
4. README with setup instructions
5. Full API documentation per endpoint following PROJECT_BLUEPRINT.md §6
6. TypeScript strict mode tsconfig.json
```

---

## 13. Explicitly Out of Scope (v1)

- Full double-entry bookkeeping (formal Chart of Accounts, Balance Sheet, Trial Balance, bank reconciliation)
- Automatic VAT/income tax calculation or NBR filing integration
- Staff activity/audit log (revisit if the team using the system grows beyond the owner)
- SMS/WhatsApp delivery of reminders (in-app only for v1)
- bKash/Nagad transaction-level reconciliation beyond subscription billing
- Native mobile app (responsive web dashboard first)

---

## 14. Document Maintenance

**Update this file when:**
- A new courier provider or payment gateway is added — update §1, §3, §4
- The role model changes (e.g. adding a third role) — update §4.2 and every RLS policy that checks role
- A CVE is published for a dependency — rotate secrets if affected, upgrade to a patched release, note it in your own changelog (don't add long-lived version pins here)

**AI assistant instruction:** When using this document as context, follow the Version Safety Rule — search for current versions, never copy semver literals from this file into `package.json`.

---

*Adapted specifically for the Inventory & Accounts SaaS project — not a generic template.*