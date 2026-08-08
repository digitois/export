-- ------------------------------------------------------------------
-- Export OS - 00012: Website Builder
-- ------------------------------------------------------------------

create table public.website_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  theme public.website_theme not null default 'modern',
  is_published boolean not null default false,
  custom_domain text unique,
  primary_color text not null default '#0f172a',
  accent_color text not null default '#0284c7',
  hero_heading text,
  hero_subheading text,
  hero_image_url text,
  announcement_bar text,
  show_inquiry_form boolean not null default true,
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  analytics_id text,
  custom_css text,
  custom_footer text,
  updated_at timestamptz not null default now()
);

create trigger trg_website_settings_updated_at before update on public.website_settings
  for each row execute function set_updated_at();

create index idx_website_settings_domain on public.website_settings (custom_domain);

create table public.website_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  seo_title text,
  meta_description text,
  is_home boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create trigger trg_website_pages_updated_at before update on public.website_pages
  for each row execute function set_updated_at();

create index idx_website_pages_org on public.website_pages (organization_id);

-- Website visitor analytics
create table public.website_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  path text not null default '/',
  country text,
  referrer text,
  user_agent text,
  device text,
  visited_at timestamptz not null default now()
);

create index idx_website_visits_org on public.website_visits (organization_id);
create index idx_website_visits_org_date on public.website_visits (organization_id, visited_at);

alter table public.website_settings enable row level security;
alter table public.website_pages enable row level security;
alter table public.website_visits enable row level security;

create policy website_settings_select_org on public.website_settings
  for select using (public.is_org_member(organization_id));
create policy website_settings_insert_org on public.website_settings
  for insert with check (public.is_org_member(organization_id));
create policy website_settings_update_org on public.website_settings
  for update using (public.has_role(organization_id, 'admin'));

create policy website_pages_select_org on public.website_pages
  for select using (public.is_org_member(organization_id));
create policy website_pages_insert_org on public.website_pages
  for insert with check (public.is_org_member(organization_id));
create policy website_pages_update_org on public.website_pages
  for update using (public.has_role(organization_id, 'manager'));
create policy website_pages_delete_org on public.website_pages
  for delete using (public.has_role(organization_id, 'manager'));

-- Public read access for published website content (anon key)
create policy website_settings_select_public on public.website_settings
  for select using (is_published = true);
create policy website_pages_select_public on public.website_pages
  for select using (is_published = true);
create policy products_select_public on public.products
  for select using (status = 'published');

-- Allow anon inserts of leads from public inquiry forms (with validation gate)
create policy leads_insert_public on public.leads
  for insert with check (
    source = 'website'
    and organization_id in (
      select o.id from public.organizations o
      join public.website_settings ws on ws.organization_id = o.id
      where ws.is_published = true
    )
  );

-- Allow anon inserts of website visits (only for published sites)
create policy website_visits_insert_public on public.website_visits
  for insert with check (
    organization_id in (
      select ws.organization_id from public.website_settings ws
      where ws.is_published = true
    )
  );
create policy website_visits_select_public_own on public.website_visits
  for select using (public.is_org_member(organization_id));

-- Allow anon reads of published blog posts
create policy blog_posts_select_public on public.blog_posts
  for select using (status = 'published');
