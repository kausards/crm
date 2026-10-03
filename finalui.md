# NexusFlow CRM — Final UI/UX Audit & Implementation Plan

> **Audit Date:** 2026-10-03
> **Live App:** https://crm-orpin-theta.vercel.app
> **Codebase:** `e:\Crm`
> **Goal:** Remove AI-slop feel, human-friendly copy, clean premium SaaS look

---

## ROOT CAUSE — কেন আগের UI change দেখা যাচ্ছে না

`app/layout.tsx` ফাইল পরিবর্তন করা হয়নি। এটি এখনো Inter + Sora font দিয়ে চলছে। `globals.css`-এ Plus Jakarta Sans থাকলেও layout.tsx override করে দিচ্ছে।

**Fix করা হয়েছে (build+push বাকি):**
- Inter + Sora সরানো
- Plus Jakarta Sans + JetBrains Mono যোগ

---

## Screenshot Audit — প্রতি পেজের সমস্যা

### 1. DASHBOARD

![dashboard](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/dashboard_page_1791001818229.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Page heading | `Pulse · Md ⚡` | `Good morning, Md 👋` |
| Sub-heading | `nai · Real-time Dhaka core & courier telemetry` | `Here's what's happening today.` |
| Navbar badge | `● Dhaka Hub · 18ms` | সম্পূর্ণ সরাও |
| Navbar breadcrumb | `NexusFlow / Dashboard` | শুধু `Dashboard` |
| Sidebar label | `CORE ENGINE` | সম্পূর্ণ সরাও |
| Section title | `Operations Queue` | `Quick Actions` |
| Badge | `● Courier Webhooks Active` | সরাও |
| Chart label | `Revenue & Profit Dynamics` | `Revenue vs Profit` |
| Chart subtitle | `30-day rolling performance curve across sales channels` | `Last 30 days` |
| KPI sub | `In current batch` | `This month` |
| KPI sub | `With Steadfast & Pathao` | `In transit` |
| KPI sub | `Stock levels optimal across hubs` | `All products in stock` |
| Live Dispatch | `Manage Orders Feed` | `View All Orders` |
| Logo badge | `Dhaka Core` | সরাও |
| KPI ALL CAPS | `TODAY'S REVENUE` | `Today's Revenue` |
| KPI ALL CAPS | `ORDERS VOLUME` | `Orders` |
| KPI ALL CAPS | `GROSS PROFIT (30D)` | `Gross Profit` |
| KPI ALL CAPS | `LOW STOCK ALERT` | `Low Stock` |

---

### 2. ORDERS

![orders](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/orders_page_1791001875222.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `Fulfillment Engine` | সরাও |
| Badge | `● Auto-Sync Active` | সরাও |
| Page heading | `Orders Pipeline` | `Orders` |
| Sub-heading | `Direct consignment dispatch, risk analysis & lifecycle tracking` | `Manage and track all your orders.` |
| KPI label | `FLAGGED RISKS` | `At Risk` |
| KPI sub | `High RTO likelihood` | `Possible returns` |
| KPI sub | `With Steadfast & Pathao` | `In transit` |
| KPI sub | `COD collected` | `Successfully delivered` |
| Filter tab | `Risk Flagged` | `At Risk` |
| Table headers | ALL CAPS | Sentence case |

---

### 3. INVENTORY / PRODUCTS

![inventory](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/inventory_page_1791001929654.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `Stock Ledger` | সরাও |
| Page heading | `Products & Inventory` | `Products` |
| Sub-heading | `Real-time stock valuation, wholesale margins & warehouse allocations` | `Track your products, stock, and pricing.` |
| KPI sub | `Active items in catalog` | `Total products` |
| KPI sub | `Wholesale buy valuation` | `Total stock value` |
| KPI sub | `Below safety threshold` | `Need restocking` |
| KPI sub | `Requires immediate purchase` | `Out of stock` |
| Table col | `BUY PRICE` | `Buy Price` |
| Table col | `SELL PRICE` | `Sell Price` |
| Table col | `STOCK QTY` | `Stock` |

---

### 4. ACCOUNTS / P&L

![accounts](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/accounts_page_1791002019475.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `Deterministic Accounting` | সরাও |
| Page heading | `P&L Accounts & Cashflow` | `Finance & Accounts` |
| Sub-heading | `Reconciled revenue, wholesale COGS, staff payroll & operating expenses` | `Your financial overview for the month.` |
| KPI label | `WHOLESALE COGS` | `Cost of Goods` |
| KPI label | `OPEX OVERHEAD` | `Operating Cost` |
| KPI sub | `Direct inventory cost` | `Purchase cost` |
| KPI sub | `Rent, ads & bills` | `Bills & expenses` |
| Navbar title | `P&L Accounts` | `Finance` |
| Tab | `SKU Level Margins` | `Product Margins` |
| Tab | `Bills & Expenses Log` | `Expenses` |
| Tab | `Income Waterfall` | `Income Breakdown` |
| Table col | `SKU / PRODUCT` | `Product` |
| Table col | `WHOLESALE / RETAIL` | `Buy / Sell Price` |
| Table col | `GROSS PROFIT` | `Profit` |
| Button | `SKU P&L` | `Product P&L` |
| Button | `Monthly Excel` | `Export Excel` |
| Button | `Record Expense` | `Add Expense` |

---

### 5. PAYROLL

![payroll](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/payroll_page_1791002067508.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `Payroll Engine` | সরাও |
| Page heading | `Salary & Attendance` | `Salary & Payroll` |
| Sub-heading | `Automated attendance deduction, per-day salary divisor & digital disbursement` | `Manage staff salaries and attendance.` |
| KPI label | `BASE PAYROLL BUDGET` | `Total Budget` |
| KPI label | `NET DISBURSED` | `Paid Out` |
| KPI label | `ABSENCE DEDUCTIONS` | `Deductions` |
| KPI label | `PENDING APPROVAL` | `Pending` |
| KPI sub | `0 enrolled staff` | `Staff enrolled` |
| KPI sub | `0 staff disbursed this month` | `Disbursed this month` |
| KPI sub | `0 cumulative leave days` | `Leave days` |
| KPI sub | `Awaiting month-end run` | `Awaiting approval` |

---

### 6. COURIER TRACKER

![courier](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/courier_page_1791002145990.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `Live Courier Telemetry` | সরাও |
| Badge | `● Webhooks Active` | সরাও |
| Page heading | `Courier Logistics Tracker` | `Courier Tracker` |
| Sub-heading | `Multi-carrier dispatch routing, live consignment tracking & COD reconciliation` | `Track shipments across all your courier partners.` |
| KPI label | `IN-TRANSIT COD` | `COD In Transit` |
| KPI label | `RTO RETURN LOSS` | `Return Loss` |
| KPI sub | `Courier fulfillment ratio` | সরাও |
| KPI sub | `0 successfully delivered` | `Delivered` |
| Card sub | `Nationwide API v2.4` | সরাও |
| Card sub | `Express Dhaka Logistics v3` | সরাও |
| Card sub | `Parcel Open API Direct` | সরাও |
| Badge | `Live Token` | সরাও |
| Badge | `OAuth 2.0` | সরাও |
| Badge | `Auto-Renewing` | সরাও |
| Badge | `Auto-Reconcile` | সরাও |
| Section heading | `ACTIVE LOGISTICS INTEGRATIONS` | `Connected Couriers` |
| Section heading | `Delivery Success Matrix` | `Delivery Performance` |
| Section sub | `30-day comparative fulfillment rate vs return penalty` | `Last 30 days` |

---

### 7. SETTINGS

![settings](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/settings_page_1791002188660.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `ORGANIZATION & ACCESS` | সরাও |
| Page heading | `Settings & Team` | `Settings` |
| Sub-heading | `Manage organization profile, team members, and your cloud subscription.` | `Your account, team, and billing settings.` |
| Badge | `Multi-Tenant Isolated` | সরাও |
| Badge | `Live Ingestion` | সরাও |
| Card label | `Primary Account` | `Owner` |
| Table col | `PERMISSIONS SCOPE` | `Access Level` |
| Table col | `USER NAME` | `Name` |
| Plan feature | `Fraud Shield with phone return blacklist` | `Fraud protection` |
| Plan feature | `Daily automated DB snapshots & priority support` | `Daily backups & priority support` |
| Plan feature | `Multi-Carrier Auto Sync (Steadfast + Pathao + RedX)` | `Multi-courier sync` |
| Plan feature | `Steadfast auto-dispatch gateway` | `Auto-dispatch (Steadfast)` |

---

### 8. INTEGRATIONS / WEBSITE & STORE

![integrations](file:///C:/Users/User/.gemini/antigravity-ide/brain/b7f1d58e-d120-4809-a0c7-64ba592a3199/integrations_page_1791002229290.png)

#### AI Slop সমস্যা

| সমস্যা | বর্তমান | হবে |
|--------|---------|-----|
| Badge | `LIVE STOREFRONT INGESTION` | সরাও |
| Page heading | `Website & Store Integration` | `Website & Store` |
| Badge | `Multi-Channel` | সরাও |
| Sub-heading | (long paragraph) | `Connect your store to automatically receive orders.` |
| Card label | `STORE TENANT ID` | `Tenant ID` |
| Card label | `ORDER WEBHOOK / API URL` | `Webhook URL` |
| Card badge | `Required` | সরাও |
| Card badge | `POST` | সরাও |
| Card sub | `WooCommerce REST API connected & verified` | `Connected` |
| Method heading | `Method 1: Connect via Consumer Key & Consumer Secret (REST API)` | `Option 1 — WooCommerce API` |
| Method heading | `Method 2: Real-Time Webhook (Instant Order Push)` | `Option 2 — Webhook (Real-time)` |
| Badge | `Zero Delay` | সরাও |

---

## GLOBAL সমস্যা (সব পেজে)

### Navbar

```
বর্তমান: NexusFlow / Dashboard  ● Dhaka Hub · 18ms  [search]  [M nai]  [+ New Order]
হবে:     Dashboard               [search]             [M]      [+ New Order]
```

সরাতে হবে:
- `NexusFlow /` breadcrumb prefix
- `● Dhaka Hub · 18ms` badge পুরোটা

### Sidebar

সরাতে হবে:
- `CORE ENGINE` section label
- Logo area থেকে `Dhaka Core` badge
- User footer থেকে city label (`Dhaka`)

রাখতে হবে:
- `● Live` badge on Courier Tracker
- `Connect` badge on Website & Store
- User avatar + name + role

### KPI Cards

- Label ALL CAPS সরাও — CSS `text-transform: uppercase` বন্ধ করো

---

## Implementation Plan — ফাইল তালিকা

| ফাইল | পরিবর্তন |
|------|---------|
| `app/layout.tsx` | Done — Plus Jakarta Sans font |
| `app/globals.css` | KPI ALL CAPS fix |
| `components/layout/Navbar.tsx` | Dhaka Hub badge + breadcrumb সরাও |
| `components/layout/Sidebar.tsx` | CORE ENGINE + Dhaka Core badge সরাও |
| `app/(dashboard)/dashboard/page.tsx` | Heading, sub, section names, KPI labels |
| `app/(dashboard)/orders/page.tsx` | Badges, heading, sub, KPI, filter tabs |
| `app/(dashboard)/inventory/page.tsx` | Badges, heading, sub, table headers |
| `app/(dashboard)/accounts/page.tsx` | Badges, heading, tabs, KPI, buttons |
| `app/(dashboard)/payroll/page.tsx` | Badges, heading, KPI labels |
| `app/(dashboard)/courier/page.tsx` | Badges, heading, card sub-texts, sections |
| `app/(dashboard)/settings/page.tsx` | Badges, heading, table headers, plan features |
| `app/(dashboard)/integrations/page.tsx` | Badges, heading, method names, card labels |

**মোট: ১২টি ফাইল**

---

## যা ভালো আছে — পরিবর্তন করার দরকার নেই

- Dark color scheme এবং card layout
- Table design (orders, inventory)
- Status badges (Pending, Confirmed, Cancelled, Delivered)
- Sidebar navigation icons এবং links
- Revenue chart design
- Courier card 3-column layout
- Settings subscription plan layout
- User avatar + role display
- Search bar, bell icon, "+ New Order" button

---

## Execution Status — All Tasks Completed & Verified

- [x] 1. `layout.tsx` → Plus Jakarta Sans + JetBrains Mono fonts configured
- [x] 2. `Navbar.tsx` → Dhaka Hub badge and breadcrumb removed, title set to Finance
- [x] 3. `Sidebar.tsx` → CORE ENGINE label and Dhaka Core badge removed
- [x] 4. `dashboard/page.tsx` → Clean greeting, humanized copy, "View All Orders", all caps removed
- [x] 5. `orders/page.tsx` → Badges removed, human copy, "At Risk" filter tab, table headers cleaned
- [x] 6. `inventory/page.tsx` → Badges removed, headers cleaned, "Stock Qty" simplified to "Stock"
- [x] 7. `accounts/page.tsx` → Badges removed, clean headers, Product Margins table columns renamed
- [x] 8. `payroll/page.tsx` → Badges removed, clean KPI labels, humanized sub-labels
- [x] 9. `courier/page.tsx` → Live Courier Telemetry removed, clean headings and cards
- [x] 10. `settings/page.tsx` → Badges removed, plan features simplified, table headers cleaned
- [x] 11. `integrations/page.tsx` → Storefront badge removed, Option 1 & Option 2 simplified, card labels cleaned
- [x] 12. `customers/page.tsx` → Customer Dossier badge removed, clean heading and KPI cards
- [x] 13. `globals.css` → Global font tokens and card styles verified
- [x] 14. `npm run build` → Verified locally: 61/61 static/dynamic pages compiled with 0 errors
