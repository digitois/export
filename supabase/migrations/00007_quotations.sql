-- ------------------------------------------------------------------
-- Export OS - 00007: Quotations
-- ------------------------------------------------------------------

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quotation_number text not null,
  lead_id uuid references public.leads (id) on delete set null,
  buyer_id uuid references public.buyers (id) on delete set null,
  buyer_name text not null,
  buyer_company text,
  buyer_email text,
  buyer_phone text,
  buyer_address text,
  buyer_country text,
  currency char(3) not null default 'USD',
  incoterm public.incoterms not null default 'FOB',
  payment_terms text,
  validity_days int not null default 30,
  subtotal numeric(18, 4) not null default 0,
  discount numeric(18, 4) not null default 0,
  freight numeric(18, 4) not null default 0,
  insurance numeric(18, 4) not null default 0,
  tax numeric(18, 4) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  total numeric(18, 4) not null default 0,
  notes text,
  terms text,
  status public.quotation_status not null default 'draft',
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  expires_at timestamptz,
  pdf_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_quotations_updated_at on public.quotations;
create trigger trg_quotations_updated_at before update on public.quotations
  for each row execute function set_updated_at();

create index if not exists idx_quotations_org on public.quotations (organization_id);
create index if not exists idx_quotations_org_status on public.quotations (organization_id, status);
create index if not exists idx_quotations_number on public.quotations (organization_id, quotation_number);
create index if not exists idx_quotations_lead on public.quotations (lead_id);
create index if not exists idx_quotations_created on public.quotations (organization_id, created_at desc);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id) on delete cascade,
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

create index if not exists idx_quotation_items_org on public.quotation_items (organization_id);
create index if not exists idx_quotation_items_quotation on public.quotation_items (quotation_id);

-- Version history for quotations
create table if not exists public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  version int not null default 1,
  snapshot jsonb not null,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (quotation_id, version)
);

create index if not exists idx_quotation_versions_org on public.quotation_versions (organization_id);
create index if not exists idx_quotation_versions_quotation on public.quotation_versions (quotation_id);

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_versions enable row level security;

drop policy if exists quotations_select_org on public.quotations;
create policy quotations_select_org on public.quotations
  for select using (public.is_org_member(organization_id));
drop policy if exists quotations_insert_org on public.quotations;
create policy quotations_insert_org on public.quotations
  for insert with check (public.is_org_member(organization_id));
drop policy if exists quotations_update_org on public.quotations;
create policy quotations_update_org on public.quotations
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists quotations_delete_org on public.quotations;
create policy quotations_delete_org on public.quotations
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists quotation_items_select_org on public.quotation_items;
create policy quotation_items_select_org on public.quotation_items
  for select using (public.is_org_member(organization_id));
drop policy if exists quotation_items_insert_org on public.quotation_items;
create policy quotation_items_insert_org on public.quotation_items
  for insert with check (public.is_org_member(organization_id));
drop policy if exists quotation_items_update_org on public.quotation_items;
create policy quotation_items_update_org on public.quotation_items
  for update using (public.is_org_member(organization_id));
drop policy if exists quotation_items_delete_org on public.quotation_items;
create policy quotation_items_delete_org on public.quotation_items
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists quotation_versions_select_org on public.quotation_versions;
create policy quotation_versions_select_org on public.quotation_versions
  for select using (public.is_org_member(organization_id));
drop policy if exists quotation_versions_insert_org on public.quotation_versions;
create policy quotation_versions_insert_org on public.quotation_versions
  for insert with check (public.is_org_member(organization_id));
drop policy if exists quotation_versions_delete_org on public.quotation_versions;
create policy quotation_versions_delete_org on public.quotation_versions
  for delete using (public.has_role(organization_id, 'admin'));
