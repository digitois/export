-- ------------------------------------------------------------------
-- Export OS - 00004: Company Profile
-- ------------------------------------------------------------------

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  company_name text not null,
  logo_url text,
  gst_number text,
  iec_number text,
  pan_number text,
  address_line1 text,
  address_line2 text,
  country text,
  state text,
  city text,
  pincode text,
  contact_person text,
  email text,
  phone text,
  whatsapp text,
  website text,
  year_established int,
  business_type text,
  employee_count text,
  factory_address text,
  certifications jsonb not null default '[]'::jsonb,
  export_markets jsonb not null default '[]'::jsonb,
  product_categories jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  brochure_url text,
  tagline text,
  about text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_company_profiles_updated_at before update on public.company_profiles
  for each row execute function set_updated_at();

alter table public.company_profiles enable row level security;

create policy company_profiles_select_org on public.company_profiles
  for select using (public.is_org_member(organization_id));
create policy company_profiles_insert_org on public.company_profiles
  for insert with check (public.is_org_member(organization_id));
create policy company_profiles_update_org on public.company_profiles
  for update using (public.has_role(organization_id, 'manager'));

create index idx_company_profiles_org on public.company_profiles (organization_id);
