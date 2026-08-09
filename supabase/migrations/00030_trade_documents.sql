-- ------------------------------------------------------------------
-- Export OS - 00030: Landed cost estimates + packing lists + CoO
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'coo_type' and n.nspname = 'public') then
    create type public.coo_type as enum ('non_preferential', 'preferential', 'gst', 'wpc', 'other');
  end if;
end $$;

-- Landed-cost / duty estimates (inputs + computed result snapshot)
create table if not exists public.landed_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  currency char(3) not null default 'USD',
  product_value numeric(18, 4) not null default 0,
  freight numeric(18, 4) not null default 0,
  insurance numeric(18, 4) not null default 0,
  duty_rate numeric(6, 3) not null default 0,
  other_charges numeric(18, 4) not null default 0,
  quantity numeric(18, 4) not null default 1,
  incoterm public.incoterms not null default 'FOB',
  result jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_landed_cost_estimates_updated_at on public.landed_cost_estimates;
create trigger trg_landed_cost_estimates_updated_at before update on public.landed_cost_estimates
  for each row execute function set_updated_at();

create index if not exists idx_landed_cost_org on public.landed_cost_estimates (organization_id);
create index if not exists idx_landed_cost_created on public.landed_cost_estimates (organization_id, created_at desc);

-- Packing lists (numbered document, one row per package set)
create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  packing_list_number text not null,
  shipment_id uuid references public.shipments (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  buyer_name text not null,
  buyer_company text,
  buyer_address text,
  buyer_country text,
  container_no text,
  bl_awb_no text,
  port_of_loading text,
  port_of_discharge text,
  vessel text,
  total_packages integer not null default 0,
  total_weight_kg numeric(18, 4) not null default 0,
  total_volume_cbm numeric(18, 4) not null default 0,
  currency char(3) not null default 'USD',
  status public.document_status not null default 'active',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_packing_lists_updated_at on public.packing_lists;
create trigger trg_packing_lists_updated_at before update on public.packing_lists
  for each row execute function set_updated_at();

create index if not exists idx_packing_lists_org on public.packing_lists (organization_id);
create index if not exists idx_packing_lists_number on public.packing_lists (organization_id, packing_list_number);
create index if not exists idx_packing_lists_shipment on public.packing_lists (organization_id, shipment_id);

create table if not exists public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  packing_list_id uuid not null references public.packing_lists (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  hsn_code text,
  quantity numeric(18, 4) not null default 1,
  unit text,
  package_count integer not null default 1,
  weight_kg numeric(18, 4) not null default 0,
  volume_cbm numeric(18, 4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_packing_list_items_org on public.packing_list_items (organization_id);
create index if not exists idx_packing_list_items_list on public.packing_list_items (packing_list_id);

-- Certificates of origin (numbered document)
create table if not exists public.certificates_of_origin (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  coo_number text not null,
  certificate_type public.coo_type not null default 'non_preferential',
  shipment_id uuid references public.shipments (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  buyer_name text not null,
  buyer_company text,
  buyer_address text,
  buyer_country text,
  exporter_iec text,
  country_of_origin text not null default 'India',
  country_of_destination text,
  issued_date date not null default current_date,
  status public.document_status not null default 'active',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_certificates_of_origin_updated_at on public.certificates_of_origin;
create trigger trg_certificates_of_origin_updated_at before update on public.certificates_of_origin
  for each row execute function set_updated_at();

create index if not exists idx_coo_org on public.certificates_of_origin (organization_id);
create index if not exists idx_coo_number on public.certificates_of_origin (organization_id, coo_number);
create index if not exists idx_coo_type on public.certificates_of_origin (organization_id, certificate_type);

create table if not exists public.certificate_of_origin_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  certificate_id uuid not null references public.certificates_of_origin (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  hsn_code text,
  quantity numeric(18, 4) not null default 1,
  unit text,
  unit_value numeric(18, 4) not null default 0,
  gross_weight_kg numeric(18, 4) not null default 0,
  net_weight_kg numeric(18, 4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_coo_items_org on public.certificate_of_origin_items (organization_id);
create index if not exists idx_coo_items_certificate on public.certificate_of_origin_items (certificate_id);

alter table public.landed_cost_estimates enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;
alter table public.certificates_of_origin enable row level security;
alter table public.certificate_of_origin_items enable row level security;

drop policy if exists landed_cost_select_org on public.landed_cost_estimates;
create policy landed_cost_select_org on public.landed_cost_estimates
  for select using (public.is_org_member(organization_id));
drop policy if exists landed_cost_insert_org on public.landed_cost_estimates;
create policy landed_cost_insert_org on public.landed_cost_estimates
  for insert with check (public.is_org_member(organization_id));
drop policy if exists landed_cost_update_org on public.landed_cost_estimates;
create policy landed_cost_update_org on public.landed_cost_estimates
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists landed_cost_delete_org on public.landed_cost_estimates;
create policy landed_cost_delete_org on public.landed_cost_estimates
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists packing_lists_select_org on public.packing_lists;
create policy packing_lists_select_org on public.packing_lists
  for select using (public.is_org_member(organization_id));
drop policy if exists packing_lists_insert_org on public.packing_lists;
create policy packing_lists_insert_org on public.packing_lists
  for insert with check (public.is_org_member(organization_id));
drop policy if exists packing_lists_update_org on public.packing_lists;
create policy packing_lists_update_org on public.packing_lists
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists packing_lists_delete_org on public.packing_lists;
create policy packing_lists_delete_org on public.packing_lists
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists packing_list_items_select_org on public.packing_list_items;
create policy packing_list_items_select_org on public.packing_list_items
  for select using (public.is_org_member(organization_id));
drop policy if exists packing_list_items_insert_org on public.packing_list_items;
create policy packing_list_items_insert_org on public.packing_list_items
  for insert with check (public.is_org_member(organization_id));
drop policy if exists packing_list_items_update_org on public.packing_list_items;
create policy packing_list_items_update_org on public.packing_list_items
  for update using (public.is_org_member(organization_id));
drop policy if exists packing_list_items_delete_org on public.packing_list_items;
create policy packing_list_items_delete_org on public.packing_list_items
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists coo_select_org on public.certificates_of_origin;
create policy coo_select_org on public.certificates_of_origin
  for select using (public.is_org_member(organization_id));
drop policy if exists coo_insert_org on public.certificates_of_origin;
create policy coo_insert_org on public.certificates_of_origin
  for insert with check (public.is_org_member(organization_id));
drop policy if exists coo_update_org on public.certificates_of_origin;
create policy coo_update_org on public.certificates_of_origin
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists coo_delete_org on public.certificates_of_origin;
create policy coo_delete_org on public.certificates_of_origin
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists coo_items_select_org on public.certificate_of_origin_items;
create policy coo_items_select_org on public.certificate_of_origin_items
  for select using (public.is_org_member(organization_id));
drop policy if exists coo_items_insert_org on public.certificate_of_origin_items;
create policy coo_items_insert_org on public.certificate_of_origin_items
  for insert with check (public.is_org_member(organization_id));
drop policy if exists coo_items_update_org on public.certificate_of_origin_items;
create policy coo_items_update_org on public.certificate_of_origin_items
  for update using (public.is_org_member(organization_id));
drop policy if exists coo_items_delete_org on public.certificate_of_origin_items;
create policy coo_items_delete_org on public.certificate_of_origin_items
  for delete using (public.has_role(organization_id, 'manager'));
