# 🎨 Frontend Directory Structure

This folder contains all client-facing UI components, pages, design tokens, and frontend utilities.

## Directory Overview:
- `app/`: Next.js 15 UI Pages & App Shell
  - `(auth)/login/page.tsx` - Merchant / Staff Login
  - `(auth)/signup/page.tsx` - Store Registration
  - `onboarding/page.tsx` - Initial Opening Balances Setup
  - `(dashboard)/layout.tsx` - Responsive App Shell with Sidebar & Navbar
  - `(dashboard)/dashboard/page.tsx` - Executive KPI Dashboard & Low Stock Alerts
  - `(dashboard)/orders/page.tsx` - Full Order Management, Status Tabs & CSV Export
  - `(dashboard)/orders/new/page.tsx` - Fast POS Order Creation Form
  - `(dashboard)/inventory/page.tsx` - Product Catalog & Manual Stock Adjustment
  - `(dashboard)/courier/page.tsx` - Courier Integrations (Steadfast, Pathao, RedX)
  - `(dashboard)/accounts/page.tsx` - Accounts & P&L Drill-down, Monthly Excel Export
  - `(dashboard)/payroll/page.tsx` - HR & Attendance Payroll Engine (Custom Divisor)
  - `(dashboard)/due-loan/page.tsx` - Customer Dues (Receivable) & Supplier Loans (Payable)
  - `(dashboard)/settings/page.tsx` - Store Profile, Staff Invites & SSLCommerz Billing
  - `globals.css` - Custom Dark Theme, Scrollbars, and Glassmorphism styling
  - `providers.tsx` - React Query, Auth Context, and Toast notifications
- `components/`
  - `ui/` - Reusable UI building blocks: Button, Badge, Card, Modal, Input, Select
  - `layout/` - Responsive Sidebar and Navbar
- `lib/apiClient.ts` - Standardized fetch client with BDT formatting and error handling
- `tailwind.config.ts` & `postcss.config.mjs` - Styling configurations
