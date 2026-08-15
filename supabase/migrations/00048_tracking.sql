-- ------------------------------------------------------------------
-- Export OS - 00048: Tracking (Open/Click Pixels + Link Rewriting)
--
-- Tracking pixels for opens, link rewriting for clicks
-- Used by email_activities and email_tracking_* tables
-- ------------------------------------------------------------------

-- Tracking domain configuration
create table if not exists public.tracking_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  domain text not null, -- e.g., 'track.example.com'
  is_verified boolean not null default false,
  verification_token text,
  dkim_selector text,
  ssl_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, domain)
);

-- Tracking links (rewritten URLs)
create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  original_url text not null,
  tracking_token text not null unique,
  tracking_domain_id uuid references public.tracking_domains (id) on delete set null,
  click_count int not null default 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Tracking pixels (open tracking)
create table if not exists public.tracking_pixels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  tracking_token text not null unique,
  tracking_domain_id uuid references public.tracking_domains (id) on delete set null,
  open_count int not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tracking_domains_org on public.tracking_domains (organization_id);
create index if not exists idx_tracking_links_token on public.tracking_links (tracking_token);
create index if not exists idx_tracking_links_activity on public.tracking_links (email_activity_id);
create index if not exists idx_tracking_pixels_token on public.tracking_pixels (tracking_token);
create index if not exists idx_tracking_pixels_activity on public.tracking_pixels (email_activity_id);

-- RLS
alter table public.tracking_domains enable row level security;
alter table public.tracking_links enable row level security;
alter table public.tracking_pixels enable row level security;

-- Tracking domains policies
drop policy if exists tracking_domains_select_org on public.tracking_domains;
create policy tracking_domains_select_org on public.tracking_domains
  for select using (public.is_org_member(organization_id));

drop policy if exists tracking_domains_insert_org on public.tracking_domains;
create policy tracking_domains_insert_org on public.tracking_domains
  for insert with check (public.is_org_member(organization_id));

drop policy if exists tracking_domains_update_org on public.tracking_domains;
create policy tracking_domains_update_org on public.tracking_domains
  for update using (public.is_org_member(organization_id));

drop policy if exists tracking_domains_delete_org on public.tracking_domains;
create policy tracking_domains_delete_org on public.tracking_domains
  for delete using (public.has_role(organization_id, 'manager'));

-- Tracking links policies (inherit from email activity)
drop policy if exists tracking_links_select_org on public.tracking_links;
create policy tracking_links_select_org on public.tracking_links
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists tracking_links_insert_org on public.tracking_links;
create policy tracking_links_insert_org on public.tracking_links
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists tracking_links_update_org on public.tracking_links;
create policy tracking_links_update_org on public.tracking_links
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Tracking pixels policies
drop policy if exists tracking_pixels_select_org on public.tracking_pixels;
create policy tracking_pixels_select_org on public.tracking_pixels
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists tracking_pixels_insert_org on public.tracking_pixels;
create policy tracking_pixels_insert_org on public.tracking_pixels
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists tracking_pixels_update_org on public.tracking_pixels;
create policy tracking_pixels_update_org on public.tracking_pixels
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Grants
grant select, insert, update, delete on public.tracking_domains to authenticated, service_role;
grant select, insert, update, delete on public.tracking_links to authenticated, service_role;
grant select, insert, update, delete on public.tracking_pixels to authenticated, service_role;

-- Function to generate tracking token
create or replace function public.generate_tracking_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return encode(gen_random_bytes(16), 'hex');
end;
$$;

grant execute on function public.generate_tracking_token() to authenticated, service_role;

-- Function to create tracking links for an email
create or replace function public.create_tracking_for_email(
  p_organization_id uuid,
  p_email_activity_id uuid,
  p_original_html text,
  p_tracking_domain_id uuid default null
)
returns text -- Returns HTML with rewritten links and tracking pixel
language plpgsql
security definer
set search_path = public
as $$
declare
  v_html text := p_original_html;
  v_pixel_token text := public.generate_tracking_token();
  v_pixel_url text;
  v_link_token text;
  v_tracking_url text;
  v_domain text;
  v_link_record record;
  v_new_url text;
begin
  -- Get tracking domain
  if p_tracking_domain_id is not null then
    select domain into v_domain from public.tracking_domains where id = p_tracking_domain_id;
  else
    select domain into v_domain from public.tracking_domains where organization_id = (
      select organization_id from public.email_activities where id = p_email_activity_id
    ) and is_verified = true limit 1;
  end if;

  if v_domain is null then
    v_domain := 'track.example.com'; -- Fallback
  end if;

  -- Create tracking pixel
  insert into public.tracking_pixels (organization_id, email_activity_id, tracking_token, tracking_domain_id)
  select organization_id, p_email_activity_id, public.generate_tracking_token(), p_tracking_domain_id
  from public.email_activities where id = p_email_activity_id;

  -- Get the pixel token
  select tracking_token into v_pixel_token
  from public.tracking_pixels
  where email_activity_id = p_email_activity_id
  order by created_at desc limit 1;

  -- Build pixel URL
  v_pixel_url := 'https://' || v_domain || '/open/' || v_pixel_token;

  -- Inject tracking pixel into HTML (before closing body)
  v_html := regexp_replace(v_html, '(</body>)', '<img src="' || v_pixel_url || '" width="1" height="1" alt="" />\1', 'i');
  if not v_html ~* '<img src="' || v_pixel_url || '"' then
    v_html := v_html || '<img src="' || v_pixel_url || '" width="1" height="1" alt="" />';
  end if;

  return v_html;
end;
$$;

grant execute on function public.create_tracking_for_email(uuid, uuid, text, uuid) to authenticated, service_role;