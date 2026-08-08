-- ------------------------------------------------------------------
-- Export OS - 00008: Invoices
-- ------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_number text not null,
  invoice_type public.invoice_type not null default 'commercial',
  quotation_id uuid references public.quotations (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  buyer_id uuid references public.buyers (id) on delete set null,
  buyer_name text not null,
  buyer_company text,
  buyer_email text,
  buyer_address text,
  buyer_country text,
  invoice_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'USD',
  payment_terms text,
  subtotal numeric(18, 4) not null default 0,
  discount numeric(18, 4) not null default 0,
  tax numeric(18, 4) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  shipping_charges numeric(18, 4) not null default 0,
  total numeric(18, 4) not null default 0,
  amount_paid numeric(18, 4) not null default 0,
  notes text,
  status public.invoice_status not null default 'draft',
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_invoices_updated_at before update on public.invoices
  for each row execute function set_updated_at();

create index idx_invoices_org on public.invoices (organization_id);
create index idx_invoices_org_status on public.invoices (organization_id, status);
create index idx_invoices_org_type on public.invoices (organization_id, invoice_type);
create index idx_invoices_number on public.invoices (organization_id, invoice_number);
create index idx_invoices_created on public.invoices (organization_id, created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  hsn_code text,
  quantity numeric(18, 4) not null default 1,
  unit text,
  unit_price numeric(18, 4) not null default 0,
  amount numeric(18, 4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_invoice_items_org on public.invoice_items (organization_id);
create index idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- Payments received against invoices
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(18, 4) not null,
  currency char(3) not null default 'USD',
  payment_date date not null default current_date,
  method text not null default 'bank_transfer',
  reference text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index idx_invoice_payments_org on public.invoice_payments (organization_id);
create index idx_invoice_payments_invoice on public.invoice_payments (invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;

create policy invoices_select_org on public.invoices
  for select using (public.is_org_member(organization_id));
create policy invoices_insert_org on public.invoices
  for insert with check (public.is_org_member(organization_id));
create policy invoices_update_org on public.invoices
  for update using (public.has_role(organization_id, 'employee'));
create policy invoices_delete_org on public.invoices
  for delete using (public.has_role(organization_id, 'manager'));

create policy invoice_items_select_org on public.invoice_items
  for select using (public.is_org_member(organization_id));
create policy invoice_items_insert_org on public.invoice_items
  for insert with check (public.is_org_member(organization_id));
create policy invoice_items_update_org on public.invoice_items
  for update using (public.is_org_member(organization_id));
create policy invoice_items_delete_org on public.invoice_items
  for delete using (public.has_role(organization_id, 'manager'));

create policy invoice_payments_select_org on public.invoice_payments
  for select using (public.is_org_member(organization_id));
create policy invoice_payments_insert_org on public.invoice_payments
  for insert with check (public.is_org_member(organization_id));
create policy invoice_payments_update_org on public.invoice_payments
  for update using (public.is_org_member(organization_id));
create policy invoice_payments_delete_org on public.invoice_payments
  for delete using (public.has_role(organization_id, 'admin'));
