-- ------------------------------------------------------------------
-- Export OS - 00005: Products
-- ------------------------------------------------------------------

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id uuid references public.product_categories (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at before update on public.product_categories
  for each row execute function set_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  slug text not null,
  sku text,
  hsn_code text,
  description text,
  technical_specifications jsonb not null default '{}'::jsonb,
  packaging_details text,
  moq text,
  lead_time text,
  price numeric(18, 4),
  currency char(3) not null default 'USD',
  unit text default 'pcs',
  status public.product_status not null default 'draft',
  meta_title text,
  meta_description text,
  featured boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function set_updated_at();

create index if not exists idx_products_org on public.products (organization_id);
create index if not exists idx_products_org_status on public.products (organization_id, status);
create index if not exists idx_products_org_category on public.products (organization_id, category_id);
create index if not exists idx_products_org_slug on public.products (organization_id, slug);

-- Product variants (size, color, grade, etc.)
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text,
  price numeric(18, 4),
  attributes jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at before update on public.product_variants
  for each row execute function set_updated_at();

create index if not exists idx_product_variants_org on public.product_variants (organization_id);
create index if not exists idx_product_variants_product on public.product_variants (product_id);

-- Product media (images / videos)
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null default 'image', -- image | video
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_media_product on public.product_media (product_id);
create index if not exists idx_product_media_org on public.product_media (organization_id);

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;

drop policy if exists product_categories_select_org on public.product_categories;
create policy product_categories_select_org on public.product_categories
  for select using (public.is_org_member(organization_id));
drop policy if exists product_categories_insert_org on public.product_categories;
create policy product_categories_insert_org on public.product_categories
  for insert with check (public.is_org_member(organization_id));
drop policy if exists product_categories_update_org on public.product_categories;
create policy product_categories_update_org on public.product_categories
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists product_categories_delete_org on public.product_categories;
create policy product_categories_delete_org on public.product_categories
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists products_select_org on public.products;
create policy products_select_org on public.products
  for select using (public.is_org_member(organization_id));
drop policy if exists products_insert_org on public.products;
create policy products_insert_org on public.products
  for insert with check (public.is_org_member(organization_id));
drop policy if exists products_update_org on public.products;
create policy products_update_org on public.products
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists products_delete_org on public.products;
create policy products_delete_org on public.products
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists product_variants_select_org on public.product_variants;
create policy product_variants_select_org on public.product_variants
  for select using (public.is_org_member(organization_id));
drop policy if exists product_variants_insert_org on public.product_variants;
create policy product_variants_insert_org on public.product_variants
  for insert with check (public.is_org_member(organization_id));
drop policy if exists product_variants_update_org on public.product_variants;
create policy product_variants_update_org on public.product_variants
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists product_variants_delete_org on public.product_variants;
create policy product_variants_delete_org on public.product_variants
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists product_media_select_org on public.product_media;
create policy product_media_select_org on public.product_media
  for select using (public.is_org_member(organization_id));
drop policy if exists product_media_insert_org on public.product_media;
create policy product_media_insert_org on public.product_media
  for insert with check (public.is_org_member(organization_id));
drop policy if exists product_media_update_org on public.product_media;
create policy product_media_update_org on public.product_media
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists product_media_delete_org on public.product_media;
create policy product_media_delete_org on public.product_media
  for delete using (public.has_role(organization_id, 'manager'));
