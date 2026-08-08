-- ------------------------------------------------------------------
-- Export OS - 00011: Blog / SEO Content
-- ------------------------------------------------------------------

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  cover_image_url text,
  keyword text,
  target_country text,
  target_product text,
  seo_title text,
  meta_description text,
  faqs jsonb not null default '[]'::jsonb,
  schema_json jsonb not null default '{}'::jsonb,
  author_id uuid references public.profiles (id),
  status public.blog_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at before update on public.blog_posts
  for each row execute function set_updated_at();

create index if not exists idx_blog_posts_org on public.blog_posts (organization_id);
create index if not exists idx_blog_posts_org_status on public.blog_posts (organization_id, status);
create index if not exists idx_blog_posts_org_slug on public.blog_posts (organization_id, slug);
create index if not exists idx_blog_posts_created on public.blog_posts (organization_id, created_at desc);

-- Track blog post views (for analytics)
create table if not exists public.blog_post_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  blog_post_id uuid not null references public.blog_posts (id) on delete cascade,
  country text,
  referrer text,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_blog_post_views_org on public.blog_post_views (organization_id);
create index if not exists idx_blog_post_views_post on public.blog_post_views (blog_post_id);
create index if not exists idx_blog_post_views_date on public.blog_post_views (organization_id, viewed_at);

alter table public.blog_posts enable row level security;
alter table public.blog_post_views enable row level security;

drop policy if exists blog_posts_select_org on public.blog_posts;
create policy blog_posts_select_org on public.blog_posts
  for select using (public.is_org_member(organization_id));
drop policy if exists blog_posts_insert_org on public.blog_posts;
create policy blog_posts_insert_org on public.blog_posts
  for insert with check (public.is_org_member(organization_id));
drop policy if exists blog_posts_update_org on public.blog_posts;
create policy blog_posts_update_org on public.blog_posts
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists blog_posts_delete_org on public.blog_posts;
create policy blog_posts_delete_org on public.blog_posts
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists blog_post_views_select_org on public.blog_post_views;
create policy blog_post_views_select_org on public.blog_post_views
  for select using (public.is_org_member(organization_id));
drop policy if exists blog_post_views_insert_org on public.blog_post_views;
create policy blog_post_views_insert_org on public.blog_post_views
  for insert with check (public.is_org_member(organization_id));
drop policy if exists blog_post_views_delete_org on public.blog_post_views;
create policy blog_post_views_delete_org on public.blog_post_views
  for delete using (public.has_role(organization_id, 'admin'));
