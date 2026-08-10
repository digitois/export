-- ------------------------------------------------------------------
-- Export OS - 00038: SaaS Billing — platform invoices to organizations
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'saas_invoice_status' and n.nspname = 'public') then
    create type public.saas_invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
  end if;
end $$;

-- Platform invoice issued to an organization (SaaS billing, distinct from
-- export-trade invoices in public.invoices).
create table if not exists public.saas_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  invoice_number text not null,
  billing_period_start date not null,
  billing_period_end date not null,
  issue_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'USD',
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  status public.saas_invoice_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_invoice_period_check check (billing_period_end >= billing_period_start),
  unique (organization_id, invoice_number)
);

drop trigger if exists trg_saas_invoices_updated_at on public.saas_invoices;
create trigger trg_saas_invoices_updated_at before update on public.saas_invoices
  for each row execute function set_updated_at();

create index if not exists idx_saas_invoices_org on public.saas_invoices (organization_id);
create index if not exists idx_saas_invoices_status on public.saas_invoices (organization_id, status);
create index if not exists idx_saas_invoices_subscription on public.saas_invoices (subscription_id);

create table if not exists public.saas_invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  saas_invoice_id uuid not null references public.saas_invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_saas_invoice_items_org on public.saas_invoice_items (organization_id);
create index if not exists idx_saas_invoice_items_invoice on public.saas_invoice_items (saas_invoice_id);

alter table public.saas_invoices enable row level security;
alter table public.saas_invoice_items enable row level security;

-- Tenant policies: org members see their own invoices
drop policy if exists saas_invoices_select_org on public.saas_invoices;
create policy saas_invoices_select_org on public.saas_invoices
  for select using (public.is_org_member(organization_id));
drop policy if exists saas_invoice_items_select_org on public.saas_invoice_items;
create policy saas_invoice_items_select_org on public.saas_invoice_items
  for select using (public.is_org_member(organization_id));

-- Platform admin policies (cross-tenant read/write)
drop policy if exists saas_invoices_select_admin on public.saas_invoices;
create policy saas_invoices_select_admin on public.saas_invoices
  for select using (public.is_platform_admin());
drop policy if exists saas_invoices_insert_admin on public.saas_invoices;
create policy saas_invoices_insert_admin on public.saas_invoices
  for insert with check (public.is_platform_admin());
drop policy if exists saas_invoices_update_admin on public.saas_invoices;
create policy saas_invoices_update_admin on public.saas_invoices
  for update using (public.is_platform_admin());
drop policy if exists saas_invoices_delete_admin on public.saas_invoices;
create policy saas_invoices_delete_admin on public.saas_invoices
  for delete using (public.is_platform_admin());

drop policy if exists saas_invoice_items_select_admin on public.saas_invoice_items;
create policy saas_invoice_items_select_admin on public.saas_invoice_items
  for select using (public.is_platform_admin());
drop policy if exists saas_invoice_items_insert_admin on public.saas_invoice_items;
create policy saas_invoice_items_insert_admin on public.saas_invoice_items
  for insert with check (public.is_platform_admin());
drop policy if exists saas_invoice_items_update_admin on public.saas_invoice_items;
create policy saas_invoice_items_update_admin on public.saas_invoice_items
  for update using (public.is_platform_admin());
drop policy if exists saas_invoice_items_delete_admin on public.saas_invoice_items;
create policy saas_invoice_items_delete_admin on public.saas_invoice_items
  for delete using (public.is_platform_admin());
