# Google Stitch — UI/UX Prompt Sheet

> Full-app UI/UX design prompts for **stitch.withgoogle.com**, covering every page of the Inventory & Accounts SaaS. Theme: premium dark SaaS dashboard, purple → pink gradient accent on black, award-winning/modern style (Linear / Vercel / Stripe dashboard-inspired).

---

## Kivabe use korba (kivabe eita use korte hobe)

1. **stitch.withgoogle.com** e giye Google account diye login koro.
2. Notun ekta project create koro. **Prothome "Master Theme Prompt"** ta paste kore run koro — eita overall color/style/font set kore dibe.
3. Shei **same project-er moddhe** (Stitch multi-screen support kore) protita "Flow" prompt ekta ekta kore add koro — eita korle shob screen-e color/style **consistent** thakbe.
4. Output dekhe je kono screen-e chaile choto refine-prompt diye customize koro (e.g. *"make the sidebar narrower"*, *"increase the metric card font size"*).
5. Shesh-e HTML/CSS ba Figma export kore Antigravity IDE-ke reference hisebe dite paro.

**Note:** Explanation Banglish-e likhchi jate sohoje bujho, kintu actual prompt-gula (Stitch-e paste korar text) **English-e likhecho** — karon Stitch English design-vocabulary (glassmorphism, gradient, hex code) diye best result dey, ei practice-ta official Stitch prompt guide-eo recommend kora hoy.

---

## Theme — Color Palette (fixed reference)

| Use | Color |
|---|---|
| Background (base) | `#0B0810` — near-black, purple undertone |
| Card/surface | `#171320` |
| Primary gradient | Violet `#8B5CF6` → Magenta-Pink `#EC4899` |
| Text (primary) | `#F5F3F7` |
| Text (muted) | `#A1A1AA` |
| Success (profit) | `#22C55E` |
| Danger (loss/return) | `#EF4444` |
| Warning (low-stock/risk-flag) | `#F59E0B` |
| Heading font | Sora / Plus Jakarta Sans |
| Body font | Inter |

---

## Master Theme Prompt (paste this FIRST)

```
Design a premium, modern, award-winning SaaS dashboard interface with a dark, high-end fintech aesthetic similar to Linear, Vercel, and Stripe's dashboard. Use a color palette built around a deep near-black background (#0B0810) with dark purple-tinted card surfaces (#171320), and a signature gradient accent flowing from vivid violet (#8B5CF6) into hot magenta-pink (#EC4899), used for primary buttons, active navigation states, key metric highlights, chart lines, and glowing card borders. Use crisp off-white text (#F5F3F7) for primary content and soft muted gray (#A1A1AA) for secondary text. Keep semantic colors clean: emerald green (#22C55E) for profit/positive figures, red (#EF4444) for loss/return/negative figures, and amber (#F59E0B) for warning and low-stock/risk-flag badges. Use a modern geometric sans-serif like Sora or Plus Jakarta Sans for headings and Inter for body text. Apply generous rounded-2xl corners on cards and buttons, soft ambient purple-pink gradient glow/blur shapes in the background behind key sections for visual depth, subtle glassmorphism on cards (slight transparency and blur), clean card-based grid layouts with a persistent left sidebar navigation, and micro-interaction hover states on buttons and rows. Target a desktop-first responsive web app layout.
```

---

## Flow 1 — Login, Signup & Onboarding

*(Ei flow-e: Login, Signup, ar 3-step Onboarding wizard — business profile, opening balance, courier connect)*

```
Design a 3-screen onboarding flow for a multi-tenant B2B SaaS. Screen 1 is a clean split-screen Login page with the brand logo and a soft purple-pink gradient hero illustration on the left, and a minimal email/password login form plus a "Continue with Google" button on the right. Screen 2 is a Signup page with business name, owner name, email, phone, and password fields, using the same split layout. Screen 3 is a multi-step Onboarding Wizard shown as a horizontal progress stepper with three steps: Step 1 "Business Profile" (business name, business type dropdown, address, logo upload), Step 2 "Opening Balance" (a simple form to enter starting stock value, starting customer dues, and starting loan balance, with helper text explaining these are one-time starting numbers so the accounts are accurate from day one), and Step 3 "Connect Courier" (three cards for Steadfast, Pathao, and RedX, each with a "Connect" button, an API key input field, and a "Skip for now" link). Each step is shown as its own full-width card centered on the page with Back/Continue buttons.
```

---

## Flow 2 — Home Dashboard

*(Aajker sale/profit/due/low-stock — ek nojore)*

```
Design a Home Dashboard screen for a multi-tenant inventory and accounting SaaS. Include a persistent left sidebar with the logo at top and navigation items: Dashboard, Products, Orders, Accounts (with a nested submenu for Product P&L, Bill & Cost, Salary, Due & Loan, Reports), Staff, and Settings. Add a top header bar with a search field, a notification bell icon with a badge count, and the user's avatar and tenant business name. In the main content area, show four key metric cards in a row at the top: "Today's Sales", "Today's Profit", "Total Pending Due", and "Low Stock Products", each with a large number, a small trend indicator, and a colored icon. Below that, use a two-column layout: a sales trend line chart for the last 30 days on the left using the gradient accent color, and a scrollable "Recent Orders" list on the right showing order ID, customer name, amount, and a colored status badge (pending, flagged with an amber warning badge, confirmed, delivered, returned). Add a small "Alerts" panel below listing low-stock products and upcoming due-date reminders as dismissible list items.
```

---

## Flow 3 — Inventory (Products)

*(Product list, tap-to-view P&L, add/edit product with variants)*

```
Design a 3-screen Inventory flow. Screen 1 "Products" is a searchable, filterable data table listing all products with columns for a product image thumbnail, name, SKU, buy price, sell price, and current stock (showing a red low-stock badge when below threshold), plus a "+ Add Product" button top-right. Screen 2 is a Product Detail / Profit-Loss drill-down page, opened by tapping a product row, showing the product image and name at top, then a row of stat cards: Total Purchased, Total Sold, Current Stock, Current Stock Value, Total Revenue, Total Cost, and Profit/Loss (colored green if positive, red if negative), followed by a stock movement history table with date, type (in/out), quantity, and reason. Screen 3 is an "Add/Edit Product" side-panel form with fields for product name, SKU, buy price, sell price, initial stock quantity, low-stock threshold, and a repeatable "Variants" section for color/size options, each with its own price and stock quantity.
```

---

## Flow 4 — Orders

*(Order list with fraud-flag, order detail with Confirm/Hold/Cancel, manual order form)*

```
Design a 3-screen Order Management flow. Screen 1 "Orders" is a data table with filter tabs for Pending, Flagged, Confirmed, Packed, Shipped, Delivered, Returned, and Cancelled, each row showing order ID, customer name and phone, product summary, total amount, a colored status badge, and for flagged orders a small amber warning icon with tooltip text like "3 previous cancels". Screen 2 is an Order Detail page showing customer info, ordered items with images and quantities, a delivery address field, a risk-check panel (visible only if flagged) summarizing the courier delivery history, and three prominent action buttons: "Confirm" (gradient primary button), "On Hold" (secondary outline button), and "Cancel" (red text button), plus a courier tracking timeline that appears once the order is confirmed. Screen 3 is a "Create Manual Order" form with customer name, phone, and address fields, a product search-and-add line-item table, and an auto-calculated order total.
```

---

## Flow 5 — Courier Settings

*(Steadfast/Pathao/RedX connect + delivery performance)*

```
Design a Courier Settings page showing three cards side by side for Steadfast, Pathao, and RedX, each with the courier's logo placeholder, a connection status badge (green "Connected" or gray "Not Connected"), an API key input field with a masked/reveal toggle, and Save/Disconnect buttons. Below the cards, show a small delivery performance widget comparing success rate versus return rate per courier as a simple horizontal bar chart using the theme's gradient and danger colors.
```

---

## Flow 6 — Accounts & Finance

*(Overview/P&L, Bill & Cost, Salary + attendance, Due & Loan ledger — the core "accountant replacement" module)*

```
Design a 4-screen Accounts & Finance section, accessible through a sub-navigation tab bar: Overview, Bill & Cost, Salary, Due & Loan. Screen 1 "Overview" shows Gross Profit and Net/Real Profit as two large hero stat cards with a subtle gradient background, below that a sortable per-product profit/loss table (product name, revenue, cost, profit), and an "Export to Excel" button plus a "Download Full Monthly Report" button top-right. Screen 2 "Bill & Cost" is a list of cost entries with columns for name, category, amount, date, and a "Recurring" badge/toggle, with a "+ Add Cost" button opening a form with name, amount, date, and a one-time-vs-recurring-monthly toggle. Screen 3 "Salary" shows an employee list with avatar, name, monthly base salary, and net payable this month; clicking an employee opens an attendance calendar (a month grid where each day can be marked Present, Absent, or Leave) alongside a live-updating payable summary card and an editable "manual adjustment" field. Screen 4 "Due & Loan" has two tabs: "Customer Due" listing party name, amount owed, due date, and payment status, and "Loan" listing loan source, total amount, repaid, and remaining balance, with a combined summary card at the top showing Total Receivable versus Total Payable.
```

---

## Flow 7 — Staff & Settings

*(Staff roles + business profile + subscription/billing)*

```
Design a 2-screen Staff & Settings section. Screen 1 "Staff" is a table of employees/users with name, a role badge (Owner shown in the gradient accent color, Staff shown in gray), status, and an "Invite Staff" button opening a modal with email and role-select fields. Screen 2 "Settings" is a tabbed page with a "Business Profile" tab (logo upload, business name, address, contact fields) and a "Subscription & Billing" tab (a current-plan card showing plan name, price, renewal date, an "Upgrade Plan" button, and payment method details).
```

---

## Flow 8 — Super-Admin Panel

*(Platform-owner view — Kausar only)*

```
Design a Super-Admin panel screen, visually distinguished from the regular tenant dashboard with a slightly different sidebar accent color to signal it's the platform-owner view. Show a table listing all tenant businesses with columns for business name, owner email, subscription plan, status (Active, Trial, or Suspended with colored badges), monthly usage stats, and join date. Include a search bar, a filter dropdown by plan and status, and a row action menu with View, Suspend, and Contact options.
```

---

## Coverage Checklist

- [x] Login / Signup / Onboarding (business profile + opening balance + courier connect)
- [x] Home Dashboard (today's sale/profit/due/low-stock + alerts)
- [x] Product list + per-product P&L drill-down + add/edit with variants
- [x] Order list (pipeline + fraud flag) + order detail (Confirm/Hold/Cancel) + manual order form
- [x] Courier connection settings
- [x] Accounts Overview (Gross/Net Profit + per-product P&L + Excel export)
- [x] Bill & Cost (manual + recurring)
- [x] Salary (attendance calendar + auto-deduction + manual override)
- [x] Due & Loan ledger (receivable + payable)
- [x] Staff management + roles
- [x] Business settings + subscription/billing
- [x] Super-admin tenant panel