# ⚙️ Backend Directory Structure

This folder contains all backend APIs, deterministic accounting engines, courier integrations, security modules, and database migrations.

## Directory Overview:
- `api/`: All 28 Server Endpoints
  - `auth/`: `signup`, `me`, `invite`
  - `orders/`: `orders`, `[id]`, `confirm`, `cancel`, `hold`, `public`
  - `products/`: `products`, `[id]`, `[id]/pnl`
  - `accounts/`: `pnl`
  - `bill-cost/`: `bill-cost`, `[id]`
  - `courier/`: `credentials`, `webhook/[provider]`
  - `due-loan/`: `due-loan`, `due`, `loan`
  - `employees/`: `employees`
  - `salary/`: `[employeeId]/attendance`, `[employeeId]/run`
  - `billing/`: `initiate`, `webhook` (SSLCommerz)
  - `export/`: `monthly` (ExcelJS)
  - `onboarding/`: `onboarding`
  - `health/`: Health check
- `accounting/`: Deterministic Financial Engines (Zero LLM)
  - `pnl.ts` - Gross Profit, COGS, Net Profit calculations
  - `salary.ts` - Attendance-linked salary engine with custom divisor
  - `stockMovement.ts` - Immutable stock movement ledger
- `courier/`: Bangladeshi Courier Integrations
  - `steadfast.ts` - Consignment creation, tracking & customer risk check
  - `pathao.ts` - Merchant consignment creation & tracking
  - `redx.ts` - Parcel creation & tracking
- `validators/`: Zod Validation Schemas
  - `auth.ts`, `order.ts`, `product.ts`, `courier.ts`, `billCost.ts`, `salary.ts`, `dueLoan.ts`, `onboarding.ts`
- `security/`:
  - `encryption.ts` - AES-256-GCM encryption at rest for courier API keys
  - `rateLimit.ts` - Upstash Redis rate limiting with sliding window fallback
- `middleware/`:
  - `middleware.ts` - Edge session protection and routing
  - `authHelper.ts` - `requireAuth(requireOwner)` session extractor
  - `apiResponse.ts` - Standardized success, paginated, and error responses
- `supabase/`:
  - `migrations/` - SQL schemas (15 tables, strict RLS, indexes)
  - `functions/` - Deno Edge Functions
  - `admin.ts`, `client.ts`, `server.ts`
- `types/`:
  - `database.types.ts` - TypeScript Database Definitions
- `env.ts` - Zod validated environment variables
