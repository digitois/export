-- ------------------------------------------------------------------
-- Export OS - 00029: Shipment / consignment tracking
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'shipment_mode' and n.nspname = 'public') then
    create type public.shipment_mode as enum ('air', 'sea', 'road', 'rail', 'courier');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'shipment_status' and n.nspname = 'public') then
    create type public.shipment_status as enum ('booked', 'in_transit', 'at_customs', 'cleared', 'delivered', 'held', 'cancelled');
  end if;
end $$;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  shipment_number text not null,
  buyer_id uuid references public.buyers (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  quotation_id uuid references public.quotations (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  buyer_name text,
  buyer_company text,
  buyer_country text,
  mode public.shipment_mode not null default 'sea',
  incoterm public.incoterms not null default 'FOB',
  origin_port text,
  destination_port text,
  container_no text,
  bl_awb_no text,
  carrier text,
  vessel text,
  etd date,
  eta date,
  actual_departure date,
  actual_arrival date,
  status public.shipment_status not null default 'booked',
  cargo_description text,
  weight_kg numeric(18, 4),
  volume_cbm numeric(18, 4),
  no_of_packages integer not null default 0,
  currency char(3) not null default 'USD',
  freight_charges numeric(18, 4) not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at before update on public.shipments
  for each row execute function set_updated_at();

create index if not exists idx_shipments_org on public.shipments (organization_id);
create index if not exists idx_shipments_org_status on public.shipments (organization_id, status);
create index if not exists idx_shipments_org_mode on public.shipments (organization_id, mode);
create index if not exists idx_shipments_number on public.shipments (organization_id, shipment_number);
create index if not exists idx_shipments_buyer on public.shipments (organization_id, buyer_id);
create index if not exists idx_shipments_created on public.shipments (organization_id, created_at desc);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  stage text not null,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_events_org on public.shipment_events (organization_id);
create index if not exists idx_shipment_events_shipment on public.shipment_events (shipment_id);
create index if not exists idx_shipment_events_occurred on public.shipment_events (shipment_id, occurred_at desc);

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

drop policy if exists shipments_select_org on public.shipments;
create policy shipments_select_org on public.shipments
  for select using (public.is_org_member(organization_id));
drop policy if exists shipments_insert_org on public.shipments;
create policy shipments_insert_org on public.shipments
  for insert with check (public.is_org_member(organization_id));
drop policy if exists shipments_update_org on public.shipments;
create policy shipments_update_org on public.shipments
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists shipments_delete_org on public.shipments;
create policy shipments_delete_org on public.shipments
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists shipment_events_select_org on public.shipment_events;
create policy shipment_events_select_org on public.shipment_events
  for select using (public.is_org_member(organization_id));
drop policy if exists shipment_events_insert_org on public.shipment_events;
create policy shipment_events_insert_org on public.shipment_events
  for insert with check (public.is_org_member(organization_id));
drop policy if exists shipment_events_update_org on public.shipment_events;
create policy shipment_events_update_org on public.shipment_events
  for update using (public.is_org_member(organization_id));
drop policy if exists shipment_events_delete_org on public.shipment_events;
create policy shipment_events_delete_org on public.shipment_events
  for delete using (public.has_role(organization_id, 'manager'));
