# NexusFlow CRM — Feature Completeness Audit

> Audited directly from `github.com/kausards/crm` source code (not UI screenshots — actual business logic). This covers the Accounts/Finance, Orders, Courier, Salary, and Multi-Tenant modules against the original spec.

**Audit date:** 2026-10-05
**Note on changes:** Fixed all High and Medium priority issues from the 2026-10-04 audit (Tenants RLS, RedX delivery area, Salary validation, Courier dispatch failure, Recurring costs duplication).

---

## 🔴 HIGH PRIORITY — fix before more tenants onboard
*No high priority issues remain in this pass.*

---

## 🟡 MEDIUM PRIORITY
*No medium priority issues remain in this pass.*

---

## 🟢 Verified correct (no action needed)

| Feature | Status |
|---|---|
| `tenants` table has Row Level Security | ✅ Correct, policy added matching tenant ID |
| RedX delivery area derived dynamically | ✅ Correct, derived from customer address |
| Salary finalize endpoint validates attendance | ✅ Correct, recomputes from `attendance` table internally |
| Recurring-cost auto-apply single mechanism | ✅ Correct, uses native `pg_cron` exclusively |
| Order Confirm courier failure blocks confirmation | ✅ Correct, surfaces 502 error and halts stock deduction |
| Gross Profit = Revenue − COGS − Return Cost | ✅ Correct, in `lib/accounting/pnl.ts` |
| Net Profit = Gross Profit − Bill/Cost − Salary | ✅ Correct |
| Salary: per-day rate = monthly salary ÷ configurable divisor | ✅ Correct, in `lib/accounting/salary.ts` |
| Salary: manual override always available and takes priority | ✅ Correct |
| Fraud/return-risk check — flag only, never auto-blocks | ✅ Correct |
| Order Confirm/Hold/Cancel — flagged orders can still be manually confirmed | ✅ Correct |
| Stock deducted on Confirm, restored on Cancel/Return | ✅ Correct, with rollback on partial failure |
| Owner-only routes (`bill-cost`, `salary`, `due-loan`, `export`, `employees`) correctly gated | ✅ Correct — all call `requireAuth(true)` |
| Courier webhook signature verification | ✅ Correct — uses `timingSafeCompare`, checks provider signature headers |
| SSLCommerz billing webhook | ✅ Correct — does server-to-server `val_id` validation against SSLCommerz's own API rather than trusting the POST body |
| Due/Loan combined dashboard with opening-balance baseline | ✅ Correct |
| Excel export coverage (bill-costs, due-loan, monthly, orders, products-pnl, salary) | ✅ All present |
| Role/tenant read from `app_metadata`/`profiles`, never user-editable `user_metadata` | ✅ Correct — good security practice |

---

## ⚪ Not deeply verified in this pass (scope limit)

- Frontend-level enforcement of Staff's limited access (routes are gated server-side, but worth confirming the UI also hides owner-only sections for staff)
- WooCommerce sync field-mapping accuracy
- Exact courier API request/response field mapping inside `lib/courier/{steadfast,pathao,redx}.ts`
- Correctness of individual RLS policy `WHERE` clauses on the 15 tables that do have RLS enabled (confirmed RLS is *on*, didn't verify every policy's logic)
- UI-level "AI slop" issues — already tracked separately in `finalui.md`