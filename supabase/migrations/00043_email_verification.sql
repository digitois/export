-- ------------------------------------------------------------------
-- Export OS - 00043: Email Verification (Local + Reoon + NeverBounce)
--
-- Local syntax/MX/disposable check + paid provider verification
-- Bulk verification jobs with progress tracking
-- ------------------------------------------------------------------

-- Verification provider types
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'verification_provider' and n.nspname = 'public') then
    create type public.verification_provider as enum ('local', 'reoon', 'neverbounce');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'verification_status' and n.nspname = 'public') then
    create type public.verification_status as enum ('valid', 'invalid', 'risky', 'unknown');
  end if;
end $$;

-- Email contacts: add verification fields
alter table public.email_contacts
  add column if not exists verification_status public.verification_status default 'unknown',
  add column if not exists verification_provider public.verification_provider,
  add column if not exists verification_checked_at timestamptz,
  add column if not exists verification_data jsonb default '{}'::jsonb;

-- Verification jobs (bulk)
create table if not exists public.verification_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid references public.email_lists (id) on delete set null,
  provider public.verification_provider not null default 'local',
  state text not null default 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  progress int not null default 0,
  total_contacts int not null default 0,
  checked_count int not null default 0,
  valid_count int not null default 0,
  invalid_count int not null default 0,
  risky_count int not null default 0,
  rate_limited_count int not null default 0,
  failed_reason text,
  result jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Verification job items (for progress tracking)
create table if not exists public.verification_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.verification_jobs (id) on delete cascade,
  contact_id uuid not null references public.email_contacts (id) on delete cascade,
  status public.verification_status,
  provider public.verification_provider,
  checked_at timestamptz,
  error text
);

-- Disposable domains cache (updated periodically)
create table if not exists public.disposable_domains (
  domain text primary key,
  source text not null, -- 'github', 'block-disposable-email', etc.
  added_at timestamptz not null default now()
);

-- Verification stats per organization
create table if not exists public.verification_stats (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  total int not null default 0,
  valid int not null default 0,
  invalid int not null default 0,
  risky int not null default 0,
  unknown int not null default 0,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_verification_jobs_org on public.verification_jobs (organization_id, state);
create index if not exists idx_verification_job_items_job on public.verification_job_items (job_id);
create index if not exists idx_verification_job_items_contact on public.verification_job_items (contact_id);
create index if not exists idx_email_contacts_verification on public.email_contacts (organization_id, verification_status);

-- Trigger for updated_at
drop trigger if exists trg_verification_jobs_updated_at on public.verification_jobs;
create trigger trg_verification_jobs_updated_at before update on public.verification_jobs
  for each row execute function set_updated_at();

drop trigger if exists trg_verification_stats_updated_at on public.verification_stats;
create trigger trg_verification_stats_updated_at before update on public.verification_stats
  for each row execute function set_updated_at();

-- RLS
alter table public.verification_jobs enable row level security;
alter table public.verification_job_items enable row level security;
alter table public.disposable_domains enable row level security;
alter table public.verification_stats enable row level security;

-- Verification jobs policies
drop policy if exists verification_jobs_select_org on public.verification_jobs;
create policy verification_jobs_select_org on public.verification_jobs
  for select using (public.is_org_member(organization_id));

drop policy if exists verification_jobs_insert_org on public.verification_jobs;
create policy verification_jobs_insert_org on public.verification_jobs
  for insert with check (public.is_org_member(organization_id));

drop policy if exists verification_jobs_update_org on public.verification_jobs;
create policy verification_jobs_update_org on public.verification_jobs
  for update using (public.is_org_member(organization_id));

drop policy if exists verification_jobs_delete_org on public.verification_jobs;
create policy verification_jobs_delete_org on public.verification_jobs
  for delete using (public.has_role(organization_id, 'manager'));

-- Verification job items policies
drop policy if exists verification_job_items_select_org on public.verification_job_items;
create policy verification_job_items_select_org on public.verification_job_items
  for select using (
    exists (
      select 1 from public.verification_jobs vj
      where vj.id = verification_job_items.job_id
      and is_org_member(vj.organization_id)
    )
  );

drop policy if exists verification_job_items_insert_org on public.verification_job_items;
create policy verification_job_items_insert_org on public.verification_job_items
  for insert with check (
    exists (
      select 1 from public.verification_jobs vj
      where vj.id = verification_job_items.job_id
      and is_org_member(vj.organization_id)
    )
  );

-- Disposable domains: read-only for org members
drop policy if exists disposable_domains_select_org on public.disposable_domains;
create policy disposable_domains_select_org on public.disposable_domains
  for select using (true);

-- Verification stats policies
drop policy if exists verification_stats_select_org on public.verification_stats;
create policy verification_stats_select_org on public.verification_stats
  for select using (public.is_org_member(organization_id));

drop policy if exists verification_stats_upsert_org on public.verification_stats;
create policy verification_stats_upsert_org on public.verification_stats
  for insert with check (public.is_org_member(organization_id));

drop policy if exists verification_stats_update_org on public.verification_stats;
create policy verification_stats_update_org on public.verification_stats
  for update using (public.is_org_member(organization_id));

-- Grants
grant select, insert, update, delete on public.verification_jobs to authenticated, service_role;
grant select, insert, update, delete on public.verification_job_items to authenticated, service_role;
grant select, insert, update, delete on public.disposable_domains to authenticated, service_role;
grant select, insert, update, delete on public.verification_stats to authenticated, service_role;

-- Helper: Update verification stats for organization
create or replace function public.update_verification_stats(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.verification_stats (organization_id, total, valid, invalid, risky, unknown, last_checked_at)
  select 
    p_organization_id,
    count(*),
    count(*) filter (where verification_status = 'valid'),
    count(*) filter (where verification_status = 'invalid'),
    count(*) filter (where verification_status = 'risky'),
    count(*) filter (where verification_status = 'unknown'),
    max(verification_checked_at)
  from public.email_contacts
  where organization_id = p_organization_id
  on conflict (organization_id) do update set
    total = excluded.total,
    valid = excluded.valid,
    invalid = excluded.invalid,
    risky = excluded.risky,
    unknown = excluded.unknown,
    last_checked_at = excluded.last_checked_at,
    updated_at = now();
end;
$$;

grant execute on function public.update_verification_stats(uuid) to authenticated, service_role;

-- Function to check if domain is disposable
create or replace function public.is_disposable_domain(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
begin
  v_domain := lower(split_part(p_email, '@', 2));
  return exists (
    select 1 from public.disposable_domains where domain = v_domain
  );
end;
$$;

grant execute on function public.is_disposable_domain(text) to authenticated, service_role;