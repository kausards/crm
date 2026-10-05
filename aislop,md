---
name: design-qa
description: Enforces NexusFlow CRM's locked design system and blocks AI-slop patterns (font drift, fake glassmorphism, fabricated trust content, over-dense pages) on every page or component created or edited. Use before considering ANY UI page, component, or styling change complete — not just when explicitly asked to "check design".
argument-hint: "[page or component being built/edited]"
license: MIT
metadata:
  author: kausar
  version: "1.0.0"
---

# Design QA Skill — Anti-AI-Slop Gate

A page is not "done" when it renders without errors. It is done when it passes every check below. Run this checklist before reporting any UI task complete — do not wait to be asked to "check the design".

## When to Use

- Creating any new page or component
- Editing an existing page's layout, copy, or styling
- Before saying "UI done" / "page complete" / "ready to review" for any frontend work

## Locked Design Tokens (source of truth: `tailwind.config.ts` + `app/globals.css`)

- **Font**: `font-sans` (Plus Jakarta Sans) only. `font-sora`, `font-inter`, `font-geist` are **legacy aliases kept only for backward compatibility** — they currently resolve correctly, but writing NEW code with these names is forbidden. Use `font-sans` / `font-headline` / `font-body` / `font-label` directly.
- **Colors**: use the `--color-*` CSS variables / Tailwind tokens only. Never write a raw hex value inline in a `className` or `style`.
- **Glass surfaces**: use the shared `<Card>` / `<StatCard>` component (`components/ui/Card.tsx`) or the `.glass-card` CSS class. Never hand-roll a new bordered `<div>` for a card-like surface.

## Mandatory pre-completion checklist

Run this on every file you touch before calling the work done:

1. **Font grep**: search the file for `font-sora`, `font-inter`, `font-geist`, or a raw `font-family:` declaration. Zero matches allowed in new/edited code.
2. **Glass check**: confirm any card-like surface uses `<Card>`/`<StatCard>`/`.glass-card`. Then confirm `.glass-card` in `app/globals.css` still actually has `backdrop-filter: blur(...)` and a semi-transparent (rgba) background — **not** a solid opaque hex. If someone reverted it to solid, fix the shared CSS class, not the individual page.
3. **No fabricated content**: no invented testimonials, customer quotes, reviews, or compliance/certification claims (e.g. "SOC2", "Bangladesh Bank Compliant") anywhere, unless the user explicitly supplied real text for it.
4. **Density check**: count dense content blocks (stat-card rows, full tables, multi-field forms) on the page. More than ~4 → split into tabs/sections instead of stacking on one scroll.
5. **Copy check**: no subtext sentence under a heading that just restates what's visually obvious in the section below it. One short tag/label is fine; a full sentence is not.
6. **Sibling check**: open one already-approved page (Orders or Products are the cleanest references) and compare structurally — a new page should look like a sibling built from the same components, not something generated independently.

If any check fails, fix it before reporting the task complete. Do not report "done" with a known violation — the same discipline as never reporting a financial calculation correct without verifying it server-side.

## One-time remediation (run once, separate from the checklist above)

A codebase-wide grep found legacy alias class names still in source despite the font supposedly being "fixed everywhere":
- `app/admin/page.tsx`, `app/admin/layout.tsx` — `font-sora`, `font-inter`
- `app/onboarding/page.tsx` — `font-sora` (multiple instances)
- `app/(dashboard)/integrations/page.tsx` — hardcoded `font-family: sans-serif` inline in the WooCommerce checkout embed HTML string

Do a project-wide find-and-replace: `font-sora` → `font-headline`, `font-inter` → `font-sans` (or `font-body` where it's body text, not a heading), `font-geist` → `font-sans`. Fix the inline style in the integrations embed to use the design token instead. Once no file references the legacy names, remove `sora`/`inter`/`geist` from `tailwind.config.ts`'s `fontFamily` block entirely — their only purpose was as a migration crutch, and leaving them in invites the next AI-assisted edit to reach for the wrong name again.