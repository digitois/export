# Phase 3 + 4 Handoff — Premium Design Pass, then ERP Buildout

> This document is a **self-contained brief** covering two phases. You (a fresh Claude on another machine) can execute both from this file alone, with no access to the originating conversation. Read it top to bottom before touching code.
>
> **Part A (§4–§9) = Phase 3**, a visual design pass — do this first, it's bounded and low-risk.
> **Part B (§10–§16) = Phase 4**, the ERP feature buildout — larger, and its exact scope should be confirmed with the user before starting (see §10).
> §1–§3 are shared setup for both.

## 0. Mission in one line

Export OS is a working multi-tenant SaaS for Indian exporters. Phases 1 (resilience) and 2 (template-first website builder) are shipped. **Phase 3** gives marketing + in-app + public exporter sites one cohesive, premium visual language. **Phase 4** grows the product into a real ERP (finance, inventory, HRM, export-trade depth) on the existing multi-tenant foundation. Neither phase may break working behavior.

Phase 3 design direction is **Hybrid**: the marketing site may be bold and lightly animated; the in-app product (dashboard, tables, forms) stays calm, light, data-dense, and breathable. Both draw from the same token system below.

## 1. Project shape

- **Stack:** Next.js 15 (App Router, React Server Components) + React 19 + TypeScript (strict). Supabase (Postgres/Auth/Storage). Tailwind CSS + shadcn/ui. Path alias `@/*` → `./src/*`.
- **Route groups under `src/app/`:**
  - `(marketing)` — public marketing site (`page.tsx`, `pricing/`, `contact/`, `_components/`, `_lib/`).
  - `(auth)` — login/signup/reset/accept-invite.
  - `(app)` — the authenticated dashboard, ~15 modules (dashboard, leads, quotations, invoices, products, buyers, documents, blog, email, analytics, hsn, team, settings, company, website, assistant).
  - `admin` — platform admin panel.
  - `s/[site]` — per-tenant public exporter websites rendered from the block engine.
- **Design system components:** `src/components/ui/` (shadcn): alert, avatar, badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, pagination, select, separator, skeleton, sonner, switch, table, tabs, textarea. `src/components/dashboard/` has `sidebar.tsx` and `user-nav.tsx`.
- **Multi-tenant theming:** per-tenant **accent color + logo only** are overridable; neutrals/structure stay constant so the product reads as one system. Preserve those override hooks.

## 2. Current state (start here)

- **Git branch:** `feat/team-fix-website-builder-premium` (base branch: `main`).
- **Commits already on the branch:** `3520587` (Phase 1) and `0399e2d` (Phase 2). Do your Phase 3 work as **new commits on this same branch** unless told otherwise.
- Phase 1 shipped: error boundaries (`(app)/error.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`), `apiData<T>()` envelope-unwrap helper in `src/lib/api-client.ts`, `/accept-invite` page, admin-flag fix, a guarded Vercel deploy CI step.
- Phase 2 shipped: `src/lib/site/templates.ts` (11 industry templates), `src/components/website-builder/template-gallery.tsx` + `template-preview.tsx`, wired into `src/app/(app)/website/page.tsx`; `steel` theme; migration `supabase/migrations/00028_website_templates.sql`.
- **`pnpm build` and `tsc --noEmit` are currently green.** Keep them green.

## 3. Environment quirks (this machine — verify on yours)

- **`pnpm` is NOT on PATH here.** Run tools via the local bin instead:
  - Build: `node_modules/.bin/next build`
  - Typecheck: `node_modules/.bin/tsc --noEmit`
  - Lint: `node_modules/.bin/next lint`
  - Tests: `node_modules/.bin/vitest run`
  - If your machine has `pnpm`, `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` map to the same scripts in `package.json`.
- **`gh` CLI is NOT installed here.** You cannot open a PR from the shell. After pushing, produce the PR via the compare URL:
  `https://github.com/digitois/export/compare/main...feat/team-fix-website-builder-premium`
- Git warns `LF will be replaced by CRLF` on Windows — harmless, ignore.
- Platform is Windows; shell is bash. Quote paths with spaces (the repo path contains a space: `D:/AI build/workspace/export_os`).

# PART A — Phase 3: Premium Design Pass

## 4. The design tokens (authoritative — from the `export-os-design` skill)

Default light theme. Per-tenant overrides touch accent + logo only.

**Color** (name — hex — role):
- `canvas` #F7F8FA — app background (never pure white; softer, premium)
- `surface` #FFFFFF — cards, panels, table rows
- `ink` #0F172A — primary text
- `muted` #64748B — secondary text, labels
- `line` #E7EAF0 — hairline borders/dividers (1px, low contrast)
- `accent` #1E6F5C — primary brand/action (deep customs-green — evokes clearance/go). **Tenant-overridable.**
- `accent-weak` #E8F2EE — accent tint for selected/active backgrounds
- Semantic (always paired with icon/label, never color alone): `pos` #157F5B, `warn` #B45309, `neg` #B42318, `info` #1D4ED8

**Typography:**
- Display/headings: confident geometric-humanist sans (Geist / Satoshi / Inter Tight) — large sizes, tight tracking, page titles + metric numbers only.
- Body/UI/data: Inter (or system fallback). **Tabular numbers on all numeric/financial/quantity cells** (`tabular-nums`).
- Scale: 12 / 13 / 14 (base UI) / 16 / 20 / 28 / 36. Labels: 12px uppercase tracked (`text-xs tracking-wide uppercase text-muted`).

**Shape & depth:**
- Radius: `rounded-xl` (12px) cards, `rounded-lg` (8px) controls, `rounded-md` chips. Consistency over exact value.
- Shadow: barely-there — `shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.06)]`. Lean on hairline borders + whitespace, not heavy drop shadows.
- Spacing: 4/8 rhythm. Card padding 20–24px. Section gaps 24–32px.

**Motion & quality floor (non-negotiable):** 150–200ms ease-out on hovers, drawer/panel slide-ins, skeleton loaders. Respect `prefers-reduced-motion`. Responsive to mobile, visible keyboard focus rings (accent), semantic HTML, sufficient contrast, **color never the sole signal**, and a designed **loading + empty + error** state for every data view.

**Signature:** draw from the shipment-journey / provenance world (status pipelines that read like a shipment's journey: In Transit → Cleared → Held at Customs → Delivered; origin/HS-code/Incoterm/currency precision) — not generic startup-SaaS motifs. Keep boldness to one place per screen; everything else stays quiet.

## 5. Where the tokens live today (what you'll change)

- `src/app/globals.css` — currently shadcn defaults as **HSL triplets** in `:root` / `.dark` (e.g. `--primary: 222 47% 11%`, `--radius: 0.5rem`). There is a `.dark` block and a `.scrollbar-thin` utility. The customs-green accent and `canvas`/`line`/semantic tokens are **not present yet** — you add them.
- `tailwind.config.ts` — maps CSS vars to Tailwind colors via `hsl(var(--x))`; `borderRadius` derives from `--radius`. `darkMode: ['class']`. Plugin: `tailwindcss-animate`. Content globs already cover `src/**`.

> **Compatibility rule:** shadcn components consume `hsl(var(--token))`. If you keep that pattern, express new tokens as HSL triplets too (e.g. `--accent: 162 57% 28%` ≈ #1E6F5C). If you switch to hex vars, update *both* `globals.css` and the `tailwind.config.ts` mapping in the same commit, or every shadcn color breaks. Safest path: **keep HSL-triplet vars**, retune their values to the palette above, and *add* new tokens (`--canvas`, `--line`, `--accent-weak`, `--pos/-warn/-neg/-info`) plus their Tailwind mappings.

## 6. Execution plan (do it in this order — each step is independently committable)

Work token-first so later steps inherit the system. After each step: typecheck + build, then commit.

### Step 1 — Design tokens (foundation)
- In `globals.css`, retune `:root` to the palette: background→`canvas` #F7F8FA, card/popover→`surface`, foreground→`ink`, muted-foreground→`muted`, border/input→`line`, primary/accent→customs-green #1E6F5C with readable foregrounds, `--radius: 0.75rem` (12px). Add `--accent-weak`, and semantic `--pos/--warn/--neg/--info`.
- In `tailwind.config.ts`, add color mappings for the new tokens (`canvas`, `line`, `accent-weak`, `pos`, `warn`, `neg`, `info`) and a `boxShadow.card` for the hairline shadow. Confirm `tabular-nums` is available (Tailwind ships `font-variant-numeric` utilities by default).
- Wire fonts (Inter + a display face) via `next/font` in the root layout if not already; expose as CSS vars.
- **Preserve the per-tenant accent override hook.** The public site already applies `--site-primary` / `--site-accent` etc. via inline style in `src/app/s/[site]/layout.tsx` and `template-preview.tsx` — do not clobber those.
- Decide on `.dark`: either retune it to a proper dark variant of the palette or leave it (the app is light-first). Don't leave it half-migrated.

### Step 2 — Shared UI primitives (`src/components/ui/*`)
Touch surgically; these are used everywhere. Align `button` (accent primary, visible focus ring), `card` (rounded-xl, hairline border, card shadow), `badge` (status-pill variants with dot + label for shipment states), `input`/`select`/`textarea` (line borders, focus ring), `skeleton` (loader), `table` (sticky header, hairline row dividers, comfortable 44–52px rows, right-aligned tabular numerics). Add status-pill and KPI-card building blocks if missing.

### Step 3 — App shell & dashboards (calm/light half of Hybrid)
`src/components/dashboard/sidebar.tsx`, `user-nav.tsx`, then module pages starting with `dashboard`, `analytics`, `leads`, `quotations`, `invoices`. KPI card row (big tabular number, tiny uppercase label, delta chip with direction icon + semantic color, optional sparkline). Primary chart (Recharts if present — restrained palette, accent for primary series, labeled axes/units, exact tooltips). Workhorse tables per Step 2. Every data view gets loading/empty/error states (empty states give direction, e.g. "No shipments yet — create your first booking").

### Step 4 — Marketing site (bold/animated half of Hybrid)
`src/app/(marketing)/page.tsx` + `_components/` (`app-mockup.tsx`, `pricing-card.tsx`), `layout.tsx`, `pricing/`, `contact/`. Premium hero, real product/module showcase, export-specific trust markers (IEC / GST / Incoterms / HS codes), pricing cards, testimonials, CTA, refreshed nav/footer. Bold and lightly animated is allowed here — but from the same tokens.

### Step 5 — Public exporter sites (`s/[site]`)
Ensure the block renderer `src/components/site/site-blocks.tsx` and the Phase 2 templates read premium by default and respect per-tenant accent/logo. This is mostly verification + polish since Phase 2 already populated it.

### Step 6 — Quality-floor sweep
Responsive check (mobile), focus rings visible, `prefers-reduced-motion` honored, contrast, color-never-sole-signal, loading/empty/error present on every data view.

## 7. Verification (run before every commit; all must pass)

```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/next build
node_modules/.bin/next lint
```

Then a visual review: marketing home, one dashboard, one public `s/[site]` — checked against the tokens in §4, at mobile + desktop widths, with reduced-motion on. Confirm no shadcn color regressions (buttons, inputs, dialogs still themed).

## 8. Guardrails

- **Additive, non-breaking.** Phase 3 is visual. Do not change data flow, API contracts, the block engine, or route structure. If a design change forces a behavior change, stop and note it.
- Match existing conventions: read a file's imports and neighbors before editing; don't introduce a new UI lib (Tailwind + shadcn only). No new comments unless the code earns them.
- Keep `tsc`/`build`/`lint` green at every commit. Never commit a broken build.
- Do not commit secrets. Leave git config untouched. New commits only (no `--amend`, no force-push) unless explicitly asked.
- Commit trailer on every commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## 9. Finish

1. Push: `git push -u origin feat/team-fix-website-builder-premium`
2. Open the PR. If `gh` exists: `gh pr create --base main --head feat/team-fix-website-builder-premium`. If not, use the compare URL in §3.
3. PR title ≤70 chars, e.g. `feat: premium design system pass (marketing, app, public sites)`. Body: summary of changes, what was tested (`tsc`/`build`/`lint` + visual review), anything deferred.

# PART B — Phase 4: ERP Buildout

## 10. Scope & how to start

Phase 4 is a **menu, not a fixed commitment**. It's large. Before writing code, confirm with the user **which modules and in what order** — do not attempt all of it in one pass. Reference products the user named: erpclaw, WorkDo Dash, ERPGo SaaS (general ERP), and eximpe (export-trade depth).

**Recommended sequencing** (highest value on the existing export foundation first):
1. **Export-trade depth** — this is the product's differentiator. Incoterms-aware costing, a duty/landed-cost calculator, packing lists & certificates of origin, shipment/consignment tracking with a customs-journey pipeline, LC/payment-terms tracking.
2. **Finance** — the invoice + `invoice_payments` tables already exist; extend into expenses, payments ledger, and light P&L. Full double-entry only if the user asks.
3. **Inventory & Warehouse** — products exist; add stock levels, warehouses, stock movements, purchase orders + suppliers.
4. **CRM depth** — leads exist; add a deal pipeline/kanban, follow-up reminders, contracts.
5. **HRM** — employees/attendance/leave/payroll-lite (only if the user prioritizes it; it's the least export-specific).
6. **SaaS platform** — org switcher UX, white-label branding, richer plan/subscription management, more payment gateways.

Build **one module end-to-end** (migration → service → API → page) and get it reviewed before starting the next. Each module is its own set of commits.

## 11. The conventions you MUST follow (read before any DB work)

The codebase is highly consistent. Copy these patterns exactly — a representative example is `supabase/migrations/00009_invoices.sql` + `src/lib/services/invoices.ts` + `src/app/api/invoices/`.

**Migrations** (`supabase/migrations/000NN_name.sql`, next number is **00029**):
- Every business table has `id uuid pk default gen_random_uuid()`, `organization_id uuid not null references public.organizations(id) on delete cascade`, `created_at`/`updated_at timestamptz`, and often `created_by uuid references public.profiles(id)`.
- Money is `numeric(18,4)`, rates `numeric(6,3)`, currency `char(3) default 'USD'`. Use enums from `00001_enums.sql` (create new enum types there or in your migration with `do $$ ... exception when duplicate_object`).
- Add indexes on `(organization_id)` and common filter combos `(organization_id, status)` etc.
- `updated_at` trigger: `create trigger trg_<table>_updated_at before update ... execute function set_updated_at();`
- **RLS is mandatory on every table.** `alter table ... enable row level security;` then four policies using the existing helpers:
  - select/insert: `public.is_org_member(organization_id)`
  - update: `public.has_role(organization_id, 'employee')` (or `'manager'`)
  - delete: `public.has_role(organization_id, 'manager')` (or `'admin'`)
  Match the exact `drop policy if exists ... / create policy ...` idempotent form used in 00009.
- Migrations must be **idempotent** (`if not exists`, `drop ... if exists` before create) — they re-run via the `migrate.yml` CI path.
- If the table should surface on public sites, extend the relevant view in a grants/views migration; most ERP tables are internal and do NOT need that.

**Service layer** (`src/lib/services/<module>.ts`):
- Pure functions taking `(supabase: SupabaseClient, organizationId: string, ...)`, returning `{ data, error }` or `{ items, count }`. Always scope every query with `.eq('organization_id', organizationId)` (defense in depth on top of RLS).
- Input types are `camelCase` interfaces; map to `snake_case` columns explicitly (as invoices.ts does) OR use the generic `camelToSnakeObject()` helper (as `website.ts` does) — match the neighboring module.
- Document numbers (invoice/quotation numbers) come from `src/lib/services/sequences.ts` — reuse it for any new numbered document (PO numbers, packing-list numbers, CoO numbers).
- Totals/computation helpers live in the service (e.g. `computeInvoiceTotals`, `round2`). Keep money math there, not in the route or component.

**API routes** (`src/app/api/<module>/route.ts` and `[id]/route.ts`):
- Resolve the current org + user from the session, call the service, wrap the result in the `{ data }` envelope via the existing `ok()` helper. Validate the body with a Zod schema in `src/lib/validations.ts` (every module has one there — add yours alongside the existing schemas).
- Client pages read through `apiData<T>()` (`src/lib/api-client.ts`), which unwraps `{ data }`. Use it — do not re-hand-roll envelope unwrapping.

**Pages** (`src/app/(app)/<module>/page.tsx`, plus `[id]/` and `new/` where it's a document):
- Follow an existing module as a template: `leads` (list + detail + new), `invoices` (document with items + PDF + payments), `products` (catalog with variants/media). Add the module to the sidebar in `src/components/dashboard/sidebar.tsx`.
- **Every data view ships loading + empty + error states** (Phase 3's quality floor applies to all new screens — build them to the tokens in §4 from the start).

## 12. Per-module build sketches

Each is: migration (new tables) → validations schema → service → API routes → page(s) → sidebar entry → verify. Sizes are rough.

**12a. Shipment / consignment tracking (export-trade — highest value).**
- Tables: `shipments` (org, buyer_id, invoice_id?, mode air/sea, incoterm enum reused from quotations, origin_port, destination_port, container_no, bl_awb_no, etd, eta, status enum) + `shipment_events` (shipment_id, stage, note, occurred_at). Status enum = customs journey: `booked → in_transit → at_customs → cleared → delivered` (+ `held`, `cancelled`).
- Page: a pipeline/kanban board keyed on status (this is the signature UI from §4), plus a detail timeline of events. Link from invoices/leads.

**12b. Landed-cost / duty calculator (export-trade).**
- Mostly compute, minimal storage. A `landed_cost_estimates` table (inputs + result JSON) if you want to save them; otherwise a client tool. Inputs: product value, freight, insurance, duty %, other charges, Incoterm → outputs per-Incoterm landed cost and per-unit cost. Reuse HSN duty data if `hsn_codes` (migration 00023) carries duty rates; check that table's columns first.
- Also: **packing lists** and **certificates of origin** as numbered documents (reuse `sequences.ts`), generated like invoices — consider extending the existing PDF/document flow.

**12c. Finance — expenses & payments ledger.**
- Tables: `expenses` (org, category enum, vendor, amount, currency, date, notes, attachment_url), and a read model over `invoice_payments` + `expenses` for cash-in/cash-out. Light P&L = revenue (invoices) − expenses over a period. Full double-entry (`accounts`, `journal_entries`, `journal_lines`) ONLY if the user explicitly wants a real ledger.
- Page: expenses CRUD + a finance dashboard (KPI cards + a cash-flow chart, per §4 analytics guidance).

**12d. Inventory & Warehouse.**
- Tables: `warehouses` (org, name, location), `stock_levels` (product_id, warehouse_id, quantity), `stock_movements` (product_id, warehouse_id, type in/out/adjust, quantity, reference, occurred_at). Optionally `suppliers` + `purchase_orders` + `purchase_order_items` (mirror the invoices/quotations shape).
- Page: stock table per warehouse, movement history, low-stock indicators.

**12e. CRM depth.**
- `leads` already exist. Add a `stage` pipeline (kanban like 12a), `follow_ups` (lead_id, due_at, done, note) with reminder surfacing, and optionally `contracts`.

**12f. HRM (least export-specific — only if prioritized).**
- `employees`, `attendance`, `leave_requests`, `payroll_runs`. Standard WorkDo/ERPGo shape. Keep it its own bounded module.

**12g. SaaS platform.**
- Billing/plans already exist (migration 00015, 00026 platform admin). Add an **org switcher** in the top bar (multi-workspace UX — the design skill calls the tenant switcher first-class), white-label accent/logo per tenant (hooks already exist from Phase 3), and richer plan management in `admin`.

## 13. AI leverage (optional, builds on existing)

`src/lib/ai.ts` + the `assistant` module + `api/ai` already exist. Phase 4 can add conversational **export-paperwork generation** (packing list, CoO, proforma) as an AI capability — assistive, user-reviewed, never fully auto-filed. Reuse the existing AI service and chat schema; don't add a second AI stack.

## 14. Verification (same as Phase 3, per module)

```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/next build
node_modules/.bin/next lint
```

Plus: run the new migration locally (`node scripts/run-migrations.mjs` — the `db:setup` script) against a dev Supabase and confirm it applies in order and is re-runnable. Manually exercise the new module (create/read/update/delete, org-scoping, RLS by logging in as a member vs non-member). Add a Vitest where there's real logic (totals/landed-cost math) — `node_modules/.bin/vitest run`.

## 15. Guardrails (Phase 4)

- **Multi-tenant safety is the top rule.** Every table has `organization_id` + RLS; every query is org-scoped. Never let one tenant read/write another's rows. Test this explicitly.
- Additive migrations only — never rewrite or renumber an existing migration; append `000NN`. Don't drop/alter existing columns other modules depend on.
- Reuse enums, helpers (`is_org_member`, `has_role`, `set_updated_at`, `sequences`, `round2`, `ok`, `apiData`) — don't fork parallel versions.
- Keep `tsc`/`build`/`lint` green at every commit; one module per PR-sized chunk so review stays tractable.
- No secrets in code. New commits only. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 16. Finish (Phase 4)

Same as §9: push the branch, open the PR (compare URL in §3 if `gh` is absent). One PR per module (or per small group) — titles like `feat(shipments): consignment tracking with customs pipeline`. Body: what shipped, migration number added, what was tested (`tsc`/`build`/`lint` + migration re-run + tenant-isolation check), what's deferred.


