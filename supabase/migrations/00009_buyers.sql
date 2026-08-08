-- ------------------------------------------------------------------
-- Export OS - 00009: Buyer Database
-- ------------------------------------------------------------------

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  address text,
  products_interested jsonb not null default '[]'::jsonb,
  notes text,
  tags text[] not null default '{}',
  last_contacted_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_buyers_updated_at before update on public.buyers
  for each row execute function set_updated_at();

create index idx_buyers_org on public.buyers (organization_id);
create index idx_buyers_org_country on public.buyers (organization_id, country);
create index idx_buyers_org_email on public.buyers (organization_id, lower(email));
create index idx_buyers_tags on public.buyers using gin (organization_id, tags);
create index idx_buyers_created on public.buyers (organization_id, created_at desc);

alter table public.buyers enable row level security;

create policy buyers_select_org on public.buyers
  for select using (public.is_org_member(organization_id));
create policy buyers_insert_org on public.buyers
  for insert with check (public.is_org_member(organization_id));
create policy buyers_update_org on public.buyers
  for update using (public.is_org_member(organization_id));
create policy buyers_delete_org on public.buyers
  for delete using (public.has_role(organization_id, 'manager'));
