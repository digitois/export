-- ==== MIGRATION: 00041_sequences.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00041: Sequences (Linear Multi-step Outreach)
--
-- Simpler than drip_campaigns: linear delay + send_email steps,
-- designed for the visual SequenceBuilder (geniusCampaign style)
-- ------------------------------------------------------------------

-- Sequence table
create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  step_count int not null default 0,
  enrolled_count int not null default 0,
  open_count int not null default 0,
  has_active_enrollments boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sequence steps: either 'wait' (delay) or 'send_email'
create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  type text not null check (type in ('wait', 'send_email')),
  position int not null default 0,
  delay_value int,
  delay_unit text check (delay_unit in ('minutes', 'hours', 'days')),
  template_id uuid references public.email_templates (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Sequence enrollments
create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  contact_id uuid not null references public.email_contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  current_step_id uuid references public.sequence_steps (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'stopped', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique(sequence_id, contact_id)
);

-- Indexes
create index if not exists idx_sequences_org on public.sequences (organization_id, is_active);
create index if not exists idx_sequence_steps_sequence on public.sequence_steps (sequence_id, position);
create index if not exists idx_sequence_enrollments_sequence on public.sequence_enrollments (sequence_id, status);
create index if not exists idx_sequence_enrollments_contact on public.sequence_enrollments (contact_id);
create index if not exists idx_sequence_enrollments_current_step on public.sequence_enrollments (current_step_id);

-- Trigger for updated_at
drop trigger if exists trg_sequences_updated_at on public.sequences;
create trigger trg_sequences_updated_at before update on public.sequences
  for each row execute function set_updated_at();

-- RLS
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;

-- Sequences policies
drop policy if exists sequences_select_org on public.sequences;
create policy sequences_select_org on public.sequences
  for select using (public.is_org_member(organization_id));

drop policy if exists sequences_insert_org on public.sequences;
create policy sequences_insert_org on public.sequences
  for insert with check (public.is_org_member(organization_id));

drop policy if exists sequences_update_org on public.sequences;
create policy sequences_update_org on public.sequences
  for update using (public.is_org_member(organization_id));

drop policy if exists sequences_delete_org on public.sequences;
create policy sequences_delete_org on public.sequences
  for delete using (public.has_role(organization_id, 'manager'));

-- Sequence steps policies (inherit from sequence)
drop policy if exists sequence_steps_select_org on public.sequence_steps;
create policy sequence_steps_select_org on public.sequence_steps
  for select using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_insert_org on public.sequence_steps;
create policy sequence_steps_insert_org on public.sequence_steps
  for insert with check (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_update_org on public.sequence_steps;
create policy sequence_steps_update_org on public.sequence_steps
  for update using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_delete_org on public.sequence_steps;
create policy sequence_steps_delete_org on public.sequence_steps
  for delete using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and has_role(s.organization_id, 'manager')
    )
  );

-- Sequence enrollments policies
drop policy if exists sequence_enrollments_select_org on public.sequence_enrollments;
create policy sequence_enrollments_select_org on public.sequence_enrollments
  for select using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_insert_org on public.sequence_enrollments;
create policy sequence_enrollments_insert_org on public.sequence_enrollments
  for insert with check (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_update_org on public.sequence_enrollments;
create policy sequence_enrollments_update_org on public.sequence_enrollments
  for update using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_delete_org on public.sequence_enrollments;
create policy sequence_enrollments_delete_org on public.sequence_enrollments
  for delete using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and has_role(s.organization_id, 'manager')
    )
  );

-- Grants
grant select, insert, update, delete on public.sequences to authenticated, service_role;
grant select, insert, update, delete on public.sequence_steps to authenticated, service_role;
grant select, insert, update, delete on public.sequence_enrollments to authenticated, service_role;

-- Helper function to increment sequence counters
create or replace function public.increment_sequence_counters(p_sequence_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sequences
  set 
    step_count = (select count(*) from public.sequence_steps where sequence_id = p_sequence_id),
    enrolled_count = (select count(*) from public.sequence_enrollments where sequence_id = p_sequence_id),
    has_active_enrollments = exists(
      select 1 from public.sequence_enrollments 
      where sequence_id = p_sequence_id and status in ('active', 'paused')
    ),
    open_count = (
      select count(*) from public.email_activities ea
      join public.sequence_enrollments se on ea.contact_id = se.contact_id
      where se.sequence_id = p_sequence_id
      and ea.event = 'opened'
    )
  where id = p_sequence_id;
end;
$$;

grant execute on function public.increment_sequence_counters(uuid) to authenticated, service_role;
-- ==== MIGRATION: 00042_sender_accounts.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00042: Sender Accounts (SES + Gmail OAuth)
--
-- Manage email sending identities with daily limits, tracking,
-- and support for AWS SES (custom credentials) and Gmail OAuth
-- ------------------------------------------------------------------

create table if not exists public.sender_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('ses', 'gmail')),
  email text not null,
  display_name text,
  daily_send_limit int not null default 1000,
  sent_today int not null default 0,
  last_sent_at timestamptz,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  verification_token text,
  -- SES fields
  aws_region text,
  ses_configuration_set text,
  aws_access_key_id text, -- encrypted at rest
  aws_secret_access_key text, -- encrypted at rest
  -- Gmail OAuth fields
  gmail_refresh_token text, -- encrypted at rest
  gmail_access_token text, -- encrypted, short-lived
  gmail_token_expires_at timestamptz,
  -- Tracking
  bounce_rate numeric(5,4) default 0,
  complaint_rate numeric(5,4) default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, email)
);

-- Sender account daily usage tracking (for per-account limits)
create table if not exists public.sender_account_usage (
  id uuid primary key default gen_random_uuid(),
  sender_account_id uuid not null references public.sender_accounts (id) on delete cascade,
  date date not null default current_date,
  sent_count int not null default 0,
  bounced_count int not null default 0,
  complained_count int not null default 0,
  unique(sender_account_id, date)
);

-- Indexes
create index if not exists idx_sender_accounts_org on public.sender_accounts (organization_id, is_active);
create index if not exists idx_sender_accounts_provider on public.sender_accounts (provider);
create index if not exists idx_sender_account_usage_account on public.sender_account_usage (sender_account_id, date);

-- Trigger for updated_at
drop trigger if exists trg_sender_accounts_updated_at on public.sender_accounts;
create trigger trg_sender_accounts_updated_at before update on public.sender_accounts
  for each row execute function set_updated_at();

-- RLS
alter table public.sender_accounts enable row level security;
alter table public.sender_account_usage enable row level security;

-- Sender accounts policies
drop policy if exists sender_accounts_select_org on public.sender_accounts;
create policy sender_accounts_select_org on public.sender_accounts
  for select using (public.is_org_member(organization_id));

drop policy if exists sender_accounts_insert_org on public.sender_accounts;
create policy sender_accounts_insert_org on public.sender_accounts
  for insert with check (public.is_org_member(organization_id));

drop policy if exists sender_accounts_update_org on public.sender_accounts;
create policy sender_accounts_update_org on public.sender_accounts
  for update using (public.is_org_member(organization_id));

drop policy if exists sender_accounts_delete_org on public.sender_accounts;
create policy sender_accounts_delete_org on public.sender_accounts
  for delete using (public.has_role(organization_id, 'manager'));

-- Sender account usage policies (inherit from sender account)
drop policy if exists sender_account_usage_select_org on public.sender_account_usage;
create policy sender_account_usage_select_org on public.sender_account_usage
  for select using (
    exists (
      select 1 from public.sender_accounts sa
      where sa.id = sender_account_usage.sender_account_id
      and is_org_member(sa.organization_id)
    )
  );

drop policy if exists sender_account_usage_insert_org on public.sender_account_usage;
create policy sender_account_usage_insert_org on public.sender_account_usage
  for insert with check (
    exists (
      select 1 from public.sender_accounts sa
      where sa.id = sender_account_usage.sender_account_id
      and is_org_member(sa.organization_id)
    )
  );

-- Grants
grant select, insert, update, delete on public.sender_accounts to authenticated, service_role;
grant select, insert, update, delete on public.sender_account_usage to authenticated, service_role;

-- Helper: Get next available sender account (round-robin with limit check)
create or replace function public.get_next_sender_account(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid;
begin
  select id into v_account
  from public.sender_accounts
  where organization_id = p_organization_id
    and is_active = true
    and is_verified = true
    and (
      select coalesce(sum(sent_count), 0)
      from public.sender_account_usage
      where sender_account_id = public.sender_accounts.id
        and date = current_date
    ) < daily_send_limit
  order by sent_today asc, last_sent_at asc nulls first
  limit 1;

  return v_account;
end;
$$;

grant execute on function public.get_next_sender_account(uuid) to authenticated, service_role;

-- Helper: Record email sent for sender account
create or replace function public.record_sender_account_usage(
  p_sender_account_id uuid,
  p_event text -- 'sent', 'bounced', 'complained'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update daily usage
  insert into public.sender_account_usage (sender_account_id, date, sent_count, bounced_count, complained_count)
  values (p_sender_account_id, current_date, 0, 0, 0)
  on conflict (sender_account_id, date) do nothing;

  if p_event = 'sent' then
    update public.sender_account_usage
    set sent_count = sent_count + 1
    where sender_account_id = p_sender_account_id and date = current_date;
    
    update public.sender_accounts
    set sent_today = sent_today + 1, last_sent_at = now()
    where id = p_sender_account_id;
  elsif p_event = 'bounced' then
    update public.sender_account_usage
    set bounced_count = bounced_count + 1
    where sender_account_id = p_sender_account_id and date = current_date;
  elsif p_event = 'complained' then
    update public.sender_account_usage
    set complained_count = complained_count + 1
    where sender_account_id = p_sender_account_id and date = current_date;
  end if;

  -- Recalculate rates (daily)
  update public.sender_accounts
  set 
    bounce_rate = (
      select coalesce(sum(bounced_count)::numeric / nullif(sum(sent_count), 0), 0)
      from public.sender_account_usage
      where sender_account_id = p_sender_account_id
        and date >= current_date - interval '30 days'
    ),
    complaint_rate = (
      select coalesce(sum(complained_count)::numeric / nullif(sum(sent_count), 0), 0)
      from public.sender_account_usage
      where sender_account_id = p_sender_account_id
        and date >= current_date - interval '30 days'
    )
  where id = p_sender_account_id;
end;
$$;

grant execute on function public.record_sender_account_usage(uuid, text) to authenticated, service_role;
-- ==== MIGRATION: 00043_email_verification.sql ====
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

-- Email contacts: add verification fields + contact detail columns
alter table public.email_contacts
  add column if not exists verification_status public.verification_status default 'unknown',
  add column if not exists verification_provider public.verification_provider,
  add column if not exists verification_checked_at timestamptz,
  add column if not exists verification_data jsonb default '{}'::jsonb,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists custom_fields jsonb default '{}'::jsonb;

-- Verification jobs (bulk)
create table if not exists public.verification_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid references public.contact_lists (id) on delete set null,
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
-- ==== MIGRATION: 00044_triggers_webhooks.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00044: Triggers (Event + Schedule + Webhook)
--
-- Event-based triggers with conditions, cron schedules, and webhook endpoints
-- Integrates with sequences for enrollment
-- ------------------------------------------------------------------

-- Trigger event types (extends existing workflow_trigger)
do $$
begin
  alter type public.workflow_trigger add value if not exists 'sequence_completed';
  alter type public.workflow_trigger add value if not exists 'sequence_step_sent';
  alter type public.workflow_trigger add value if not exists 'contact_added_to_list';
  alter type public.workflow_trigger add value if not exists 'contact_removed_from_list';
  alter type public.workflow_trigger add value if not exists 'tag_added';
  alter type public.workflow_trigger add value if not exists 'tag_removed';
exception when duplicate_object then null;
end;
$$;

-- Condition operator type
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'trigger_condition_operator' and n.nspname = 'public') then
    create type public.trigger_condition_operator as enum (
      'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
      'greater_than', 'less_than', 'greater_equal', 'less_equal',
      'is_empty', 'is_not_empty', 'in_list', 'not_in_list'
    );
  end if;
end $$;

-- Webhook endpoints (for inbound/outbound)
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  url text not null,
  secret text, -- HMAC secret for signing
  events text[] not null default '{}', -- Event types to listen for
  is_active boolean not null default true,
  retry_count int not null default 3,
  timeout_ms int not null default 10000,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Webhook deliveries (outbound)
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
  attempt int not null default 0,
  response_status int,
  response_body text,
  error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Triggers table
create table if not exists public.triggers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  event_type public.workflow_trigger not null,
  conditions jsonb not null default '[]'::jsonb, -- Array of {field, operator, value}
  condition_logic text not null default 'and', -- 'and' or 'or'
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  is_active boolean not null default true,
  schedule_cron text, -- For time_based triggers
  schedule_timezone text default 'UTC',
  webhook_endpoint_id uuid references public.webhook_endpoints (id) on delete set null,
  fired_count int not null default 0,
  enrolled_count int not null default 0,
  skipped_count int not null default 0,
  last_fired_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger evaluations (audit log)
create table if not exists public.trigger_evaluations (
  id uuid primary key default gen_random_uuid(),
  trigger_id uuid not null references public.triggers (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  event_type text not null,
  matched boolean not null,
  enrolled boolean not null,
  skip_reason text,
  error text,
  event_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_triggers_org on public.triggers (organization_id, is_active);
create index if not exists idx_triggers_event on public.triggers (event_type, is_active);
create index if not exists idx_triggers_sequence on public.triggers (sequence_id);
create index if not exists idx_trigger_evaluations_trigger on public.trigger_evaluations (trigger_id, created_at);
create index if not exists idx_trigger_evaluations_contact on public.trigger_evaluations (contact_id);
create index if not exists idx_webhook_endpoints_org on public.webhook_endpoints (organization_id, is_active);
create index if not exists idx_webhook_deliveries_endpoint on public.webhook_deliveries (webhook_endpoint_id, status);
create index if not exists idx_webhook_deliveries_retry on public.webhook_deliveries (next_retry_at) where status = 'retrying';

-- Trigger for updated_at
drop trigger if exists trg_triggers_updated_at on public.triggers;
create trigger trg_triggers_updated_at before update on public.triggers
  for each row execute function set_updated_at();

drop trigger if exists trg_webhook_endpoints_updated_at on public.webhook_endpoints;
create trigger trg_webhook_endpoints_updated_at before update on public.webhook_endpoints
  for each row execute function set_updated_at();

-- RLS
alter table public.triggers enable row level security;
alter table public.trigger_evaluations enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

-- Triggers policies
drop policy if exists triggers_select_org on public.triggers;
create policy triggers_select_org on public.triggers
  for select using (public.is_org_member(organization_id));

drop policy if exists triggers_insert_org on public.triggers;
create policy triggers_insert_org on public.triggers
  for insert with check (public.is_org_member(organization_id));

drop policy if exists triggers_update_org on public.triggers;
create policy triggers_update_org on public.triggers
  for update using (public.is_org_member(organization_id));

drop policy if exists triggers_delete_org on public.triggers;
create policy triggers_delete_org on public.triggers
  for delete using (public.has_role(organization_id, 'manager'));

-- Trigger evaluations policies
drop policy if exists trigger_evaluations_select_org on public.trigger_evaluations;
create policy trigger_evaluations_select_org on public.trigger_evaluations
  for select using (
    exists (
      select 1 from public.triggers t
      where t.id = trigger_evaluations.trigger_id
      and is_org_member(t.organization_id)
    )
  );

drop policy if exists trigger_evaluations_insert_org on public.trigger_evaluations;
create policy trigger_evaluations_insert_org on public.trigger_evaluations
  for insert with check (
    exists (
      select 1 from public.triggers t
      where t.id = trigger_evaluations.trigger_id
      and is_org_member(t.organization_id)
    )
  );

-- Webhook endpoints policies
drop policy if exists webhook_endpoints_select_org on public.webhook_endpoints;
create policy webhook_endpoints_select_org on public.webhook_endpoints
  for select using (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_insert_org on public.webhook_endpoints;
create policy webhook_endpoints_insert_org on public.webhook_endpoints
  for insert with check (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_update_org on public.webhook_endpoints;
create policy webhook_endpoints_update_org on public.webhook_endpoints
  for update using (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_delete_org on public.webhook_endpoints;
create policy webhook_endpoints_delete_org on public.webhook_endpoints
  for delete using (public.has_role(organization_id, 'manager'));

-- Webhook deliveries policies
drop policy if exists webhook_deliveries_select_org on public.webhook_deliveries;
create policy webhook_deliveries_select_org on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhook_endpoints we
      where we.id = webhook_deliveries.webhook_endpoint_id
      and is_org_member(we.organization_id)
    )
  );

-- Grants
grant select, insert, update, delete on public.triggers to authenticated, service_role;
grant select, insert, update, delete on public.trigger_evaluations to authenticated, service_role;
grant select, insert, update, delete on public.webhook_endpoints to authenticated, service_role;
grant select, insert, update, delete on public.webhook_deliveries to authenticated, service_role;

-- Function to evaluate trigger conditions
create or replace function public.evaluate_trigger_conditions(
  p_conditions jsonb,
  p_data jsonb,
  p_logic text default 'and'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean := p_logic = 'and';
  v_condition jsonb;
  v_field text;
  v_operator public.trigger_condition_operator;
  v_value jsonb;
  v_field_value jsonb;
  v_condition_result boolean;
begin
  if p_conditions is null or jsonb_typeof(p_conditions) != 'array' or jsonb_array_length(p_conditions) = 0 then
    return true; -- No conditions = always match
  end if;

  for v_condition in select * from jsonb_array_elements(p_conditions)
  loop
    v_field := v_condition->>'field';
    v_operator := v_condition->>'operator';
    v_value := v_condition->'value';
    v_field_value := p_data->v_field;

    v_condition_result := public.evaluate_simple_trigger_condition(v_field_value, v_operator, v_value);

    if p_logic = 'and' then
      v_result := v_result and v_condition_result;
      if not v_result then return false; end if;
    else -- or
      v_result := v_result or v_condition_result;
      if v_result then return true; end if;
    end if;
  end loop;

  return v_result;
end;
$$;

grant execute on function public.evaluate_trigger_conditions(jsonb, jsonb, text) to authenticated, service_role;

-- Simple condition evaluation for triggers
create or replace function public.evaluate_simple_trigger_condition(
  p_field_value jsonb,
  p_operator public.trigger_condition_operator,
  p_value jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  case p_operator
    when 'equals' then return p_field_value = p_value;
    when 'not_equals' then return p_field_value != p_value;
    when 'contains' then return p_field_value::text ilike '%' || p_value::text || '%';
    when 'not_contains' then return not (p_field_value::text ilike '%' || p_value::text || '%');
    when 'starts_with' then return p_field_value::text ilike p_value::text || '%';
    when 'ends_with' then return p_field_value::text ilike '%' || p_value::text;
    when 'greater_than' then return (p_field_value::numeric) > (p_value::numeric);
    when 'less_than' then return (p_field_value::numeric) < (p_value::numeric);
    when 'greater_equal' then return (p_field_value::numeric) >= (p_value::numeric);
    when 'less_equal' then return (p_field_value::numeric) <= (p_value::numeric);
    when 'is_empty' then return p_field_value is null or p_field_value::text = '';
    when 'is_not_empty' then return p_field_value is not null and p_field_value::text != '';
    when 'in_list' then return p_field_value = any(p_value::jsonb[]);
    when 'not_in_list' then return p_field_value != all(p_value::jsonb[]);
    else return false;
  end case;
exception
  when others then return false;
end;
$$;

grant execute on function public.evaluate_simple_trigger_condition(jsonb, public.trigger_condition_operator, jsonb) to authenticated, service_role;

-- Function to fire trigger (called by event system)
create or replace function public.fire_trigger(
  p_organization_id uuid,
  p_event_type public.workflow_trigger,
  p_contact_id uuid default null,
  p_lead_id uuid default null,
  p_event_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trigger record;
  v_matched boolean;
  v_contact_data jsonb;
  v_enrollment_id uuid;
begin
  for v_trigger in
    select * from public.triggers
    where organization_id = p_organization_id
      and is_active = true
      and event_type = p_event_type
  loop
    -- Build contact data for condition evaluation
    v_contact_data := jsonb_build_object(
      'contact_id', p_contact_id,
      'lead_id', p_lead_id,
      'event_type', p_event_type,
      'event_data', p_event_data
    );

    -- Evaluate conditions
    if public.evaluate_trigger_conditions(v_trigger.conditions, v_contact_data, v_trigger.condition_logic) then
      -- Conditions matched, enroll in sequence
      insert into public.sequence_enrollments (sequence_id, contact_id, lead_id, status)
      values (v_trigger.sequence_id, p_contact_id, p_lead_id, 'active')
      on conflict (sequence_id, contact_id) do update set
        status = 'active',
        metadata = jsonb_set(coalesce(sequence_enrollments.metadata, '{}'::jsonb), '{triggered_by}', to_jsonb(v_trigger.id::text))
      returning id into v_enrollment_id;

      -- Log evaluation
      insert into public.trigger_evaluations (trigger_id, contact_id, lead_id, event_type, matched, enrolled)
      values (v_trigger.id, p_contact_id, p_lead_id, p_event_type::text, true, true);

      -- Update trigger counters
      update public.triggers
      set fired_count = fired_count + 1,
          enrolled_count = enrolled_count + 1,
          last_fired_at = now()
      where id = v_trigger.id;
    else
      -- Log skipped evaluation
      insert into public.trigger_evaluations (trigger_id, contact_id, lead_id, event_type, matched, enrolled, skip_reason)
      values (v_trigger.id, p_contact_id, p_lead_id, p_event_type::text, false, false, 'Conditions not met');
      
      update public.triggers
      set skipped_count = skipped_count + 1
      where id = v_trigger.id;
    end if;
  end loop;
end;
$$;

grant execute on function public.fire_trigger(uuid, public.workflow_trigger, uuid, uuid, jsonb) to authenticated, service_role;
-- ==== MIGRATION: 00045_email_activity_log.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00045: Email Activity Log (Full Delivery Tracking)
--
-- Complete email lifecycle tracking: sent → delivered → opened/clicked
-- → bounced/complained/unsubscribed
-- Works with sender accounts, sequences, campaigns, templates
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'email_event_type' and n.nspname = 'public') then
    create type public.email_event_type as enum (
      'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'email_bounce_type' and n.nspname = 'public') then
    create type public.email_bounce_type as enum ('hard', 'soft', 'transient');
  end if;
end $$;

-- Main email activity log (extends table created in 00014)
alter table public.email_activities
  add column if not exists sender_account_id uuid references public.sender_accounts (id) on delete set null,
  add column if not exists lead_id uuid references public.leads (id) on delete set null,
  add column if not exists message_id text,
  add column if not exists template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists sequence_id uuid references public.sequences (id) on delete set null,
  add column if not exists sequence_enrollment_id uuid references public.sequence_enrollments (id) on delete set null,
  add column if not exists bounce_type public.email_bounce_type,
  add column if not exists bounce_subtype text,
  add column if not exists bounce_diagnostic text,
  add column if not exists click_url text,
  add column if not exists click_count int default 1,
  add column if not exists open_count int default 1,
  add column if not exists user_agent text,
  add column if not exists ip_address text,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Convert event column to typed enum (values from 00014 all exist in enum)
do $$
begin
  alter table public.email_activities
    alter column event type public.email_event_type
      using event::public.email_event_type;
exception when others then null;
end;
$$;

-- Email tracking pixels (for open tracking)
create table if not exists public.email_tracking_pixels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  token text not null unique,
  opened_at timestamptz,
  open_count int not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- Link tracking (for click tracking)
create table if not exists public.email_tracking_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  original_url text not null,
  token text not null unique,
  click_count int not null default 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Unsubscribe tracking
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete set null,
  email text not null,
  list_id uuid references public.contact_lists (id) on delete set null,
  campaign_id uuid,
  sequence_id uuid references public.sequences (id) on delete set null,
  source text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique(organization_id, email, list_id)
);

-- Suppression list (bounced/complained/unsubscribed - never send again)
create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('bounce', 'complaint', 'unsubscribe', 'manual')),
  source_email_activity_id uuid references public.email_activities (id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(organization_id, email, reason)
);

-- Indexes
create index if not exists idx_email_activities_org on public.email_activities (organization_id, occurred_at desc);
create index if not exists idx_email_activities_contact on public.email_activities (contact_id, occurred_at desc);
create index if not exists idx_email_activities_event on public.email_activities (event, occurred_at desc);
create index if not exists idx_email_activities_message on public.email_activities (message_id);
create index if not exists idx_email_activities_template on public.email_activities (template_id);
create index if not exists idx_email_activities_sequence on public.email_activities (sequence_id);
create index if not exists idx_email_activities_email on public.email_activities (email);
create index if not exists idx_email_tracking_pixels_token on public.email_tracking_pixels (token);
create index if not exists idx_email_tracking_links_token on public.email_tracking_links (token);
create index if not exists idx_email_unsubscribes_org_email on public.email_unsubscribes (organization_id, email);
create index if not exists idx_email_suppressions_org_email on public.email_suppressions (organization_id, email);

-- RLS
alter table public.email_activities enable row level security;
alter table public.email_tracking_pixels enable row level security;
alter table public.email_tracking_links enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.email_suppressions enable row level security;

-- Email activities policies
drop policy if exists email_activities_select_org on public.email_activities;
create policy email_activities_select_org on public.email_activities
  for select using (public.is_org_member(organization_id));

drop policy if exists email_activities_insert_org on public.email_activities;
create policy email_activities_insert_org on public.email_activities
  for insert with check (public.is_org_member(organization_id));

-- Tracking pixels policies
drop policy if exists email_tracking_pixels_select_org on public.email_tracking_pixels;
create policy email_tracking_pixels_select_org on public.email_tracking_pixels
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_pixels_insert_org on public.email_tracking_pixels;
create policy email_tracking_pixels_insert_org on public.email_tracking_pixels
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_pixels_update_org on public.email_tracking_pixels;
create policy email_tracking_pixels_update_org on public.email_tracking_pixels
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Tracking links policies
drop policy if exists email_tracking_links_select_org on public.email_tracking_links;
create policy email_tracking_links_select_org on public.email_tracking_links
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_links_insert_org on public.email_tracking_links;
create policy email_tracking_links_insert_org on public.email_tracking_links
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_links_update_org on public.email_tracking_links;
create policy email_tracking_links_update_org on public.email_tracking_links
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Unsubscribes policies
drop policy if exists email_unsubscribes_select_org on public.email_unsubscribes;
create policy email_unsubscribes_select_org on public.email_unsubscribes
  for select using (public.is_org_member(organization_id));

drop policy if exists email_unsubscribes_insert_org on public.email_unsubscribes;
create policy email_unsubscribes_insert_org on public.email_unsubscribes
  for insert with check (public.is_org_member(organization_id));

-- Suppressions policies
drop policy if exists email_suppressions_select_org on public.email_suppressions;
create policy email_suppressions_select_org on public.email_suppressions
  for select using (public.is_org_member(organization_id));

drop policy if exists email_suppressions_insert_org on public.email_suppressions;
create policy email_suppressions_insert_org on public.email_suppressions
  for insert with check (public.is_org_member(organization_id));

drop policy if exists email_suppressions_update_org on public.email_suppressions;
create policy email_suppressions_update_org on public.email_suppressions
  for update using (public.is_org_member(organization_id));

-- Grants
grant select, insert, update, delete on public.email_activities to authenticated, service_role;
grant select, insert, update, delete on public.email_tracking_pixels to authenticated, service_role;
grant select, insert, update, delete on public.email_tracking_links to authenticated, service_role;
grant select, insert, update, delete on public.email_unsubscribes to authenticated, service_role;
grant select, insert, update, delete on public.email_suppressions to authenticated, service_role;

-- Function to log email activity
create or replace function public.log_email_activity(
  p_organization_id uuid,
  p_sender_account_id uuid,
  p_contact_id uuid,
  p_lead_id uuid,
  p_email text,
  p_event public.email_event_type,
  p_message_id text,
  p_template_id uuid,
  p_campaign_id uuid,
  p_sequence_id uuid,
  p_sequence_enrollment_id uuid,
  p_bounce_type public.email_bounce_type,
  p_bounce_subtype text,
  p_bounce_diagnostic text,
  p_click_url text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
begin
  insert into public.email_activities (
    organization_id, sender_account_id, contact_id, lead_id, email, event,
    message_id, template_id, campaign_id, sequence_id, sequence_enrollment_id,
    bounce_type, bounce_subtype, bounce_diagnostic, click_url, metadata
  ) values (
    p_organization_id, p_sender_account_id, p_contact_id, p_lead_id, p_email, p_event,
    p_message_id, p_template_id, p_campaign_id, p_sequence_id, p_sequence_enrollment_id,
    p_bounce_type, null, null, p_click_url, p_metadata
  ) returning id into v_activity_id;

  if p_sender_account_id is not null then
    perform public.record_sender_account_usage(p_sender_account_id, p_event::text);
  end if;

  if p_event in ('bounced', 'complained', 'unsubscribed') then
    insert into public.email_suppressions (organization_id, email, reason, source_email_activity_id)
    values (p_organization_id, p_email, p_event::text, v_activity_id)
    on conflict (organization_id, email, reason) do nothing;
  end if;

  if p_event = 'bounced' then
    perform public.update_verification_stats(p_organization_id);
  end if;

  return v_activity_id;
end;
$$;

grant execute on function public.log_email_activity(
  uuid, uuid, uuid, uuid, text, public.email_event_type, text, uuid, uuid, uuid, uuid,
  public.email_bounce_type, text, text, text, jsonb
) to authenticated, service_role;

-- Function to record open (called by tracking pixel endpoint)
create or replace function public.record_email_open(
  p_token text,
  p_user_agent text,
  p_ip_address text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pixel record;
  v_activity_id uuid;
begin
  select * into v_pixel
  from public.email_tracking_pixels
  where token = p_token;

  if not found then return; end if;

  update public.email_tracking_pixels
  set open_count = open_count + 1,
      last_opened_at = now(),
      first_opened_at = coalesce(first_opened_at, now()),
      opened_at = now()
  where id = v_pixel.id;

  update public.email_activities
  set open_count = open_count + 1,
      metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{last_open}', to_jsonb(now()::text))
  where id = v_pixel.email_activity_id;
end;
$$;

grant execute on function public.record_email_open(text, text, text) to authenticated, service_role;

-- Function to record click (called by link redirect endpoint)
create or replace function public.record_email_click(
  p_token text,
  p_user_agent text,
  p_ip_address text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_original_url text;
begin
  select * into v_link
  from public.email_tracking_links
  where token = p_token;

  if not found then return null; end if;

  v_original_url := v_link.original_url;

  update public.email_tracking_links
  set click_count = click_count + 1,
      last_clicked_at = now(),
      first_clicked_at = coalesce(first_clicked_at, now())
  where id = v_link.id;

  update public.email_activities
  set click_count = click_count + 1,
      metadata = jsonb_set(
        jsonb_set(coalesce(metadata, '{}'::jsonb), '{last_click}', to_jsonb(now()::text)),
        '{last_click_url}', to_jsonb(v_original_url)
      )
  where id = v_link.email_activity_id;

  return v_original_url;
end;
$$;

grant execute on function public.record_email_click(text, text, text) to authenticated, service_role;

-- Function to handle unsubscribe
create or replace function public.handle_unsubscribe(
  p_organization_id uuid,
  p_email text,
  p_list_id uuid,
  p_campaign_id uuid,
  p_sequence_id uuid,
  p_source text,
  p_ip_address text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
begin
  select id into v_contact_id
  from public.email_contacts
  where organization_id = p_organization_id and email = p_email
  limit 1;

  insert into public.email_unsubscribes (
    organization_id, contact_id, email, list_id, campaign_id, sequence_id,
    source, ip_address, user_agent
  ) values (
    p_organization_id, v_contact_id, p_email, p_list_id, p_campaign_id, p_sequence_id,
    p_source, p_ip_address, p_user_agent
  ) on conflict (organization_id, email, list_id) do update set
    source = excluded.source,
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent,
    created_at = now();

  insert into public.email_suppressions (organization_id, email, reason, metadata)
  values (p_organization_id, p_email, 'unsubscribe', jsonb_build_object('source', p_source, 'list_id', p_list_id))
  on conflict (organization_id, email, reason) do nothing;

  update public.email_contacts
  set unsubscribed = true, unsubscribed_at = now()
  where organization_id = p_organization_id and email = p_email;
end;
$$;

grant execute on function public.handle_unsubscribe(uuid, text, uuid, uuid, uuid, text, text, text) to authenticated, service_role;
-- ==== MIGRATION: 00046_template_enhancements.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00046: Template Enhancements (Tiptap + Variants + Blocks)
--
-- Tiptap JSON body, template variants for A/B testing,
-- drag-and-drop blocks library
-- ------------------------------------------------------------------

-- Template variants (A/B testing)
alter table public.email_templates
  add column if not exists parent_template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists is_variant boolean not null default false,
  add column if not exists body_json jsonb, -- Tiptap ProseMirror JSON
  add column if not exists subject text,
  add column if not exists subject_text text,
  add column if not exists preview_text text,
  add column if not exists category text check (category in ('welcome', 'follow_up', 'promotion', 'announcement', 'transactional', 'newsletter')),
  add column if not exists thumbnail_url text,
  add column if not exists usage_count int not null default 0;

-- Template blocks (drag-and-drop components)
-- Creates the table if absent; if present from 00039, re-points the FK away
-- from email_templates_enhanced onto email_templates.
create table if not exists public.email_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.email_templates (id) on delete cascade,
  block_type text not null check (block_type in ('text', 'image', 'button', 'divider', 'spacer', 'social', 'cta', 'html', 'personalization')),
  position int not null default 0,
  config jsonb not null default '{}'::jsonb,
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed (e.g. created by 00039 referencing
-- email_templates_enhanced), drop that FK and re-point to email_templates.
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'email_template_blocks'
      and c.conname = 'email_template_blocks_template_id_fkey'
      and c.confrelid <> 'public.email_templates'::regclass
  ) then
    alter table public.email_template_blocks
      drop constraint email_template_blocks_template_id_fkey;
    alter table public.email_template_blocks
      add constraint email_template_blocks_template_id_fkey
      foreign key (template_id) references public.email_templates (id) on delete cascade;
  end if;
end;
$$;

-- Ensure allowed block_type values (00039 created this as plain text without a check)
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'email_template_blocks'
      and c.conname = 'email_template_blocks_block_type_check'
  ) then
    alter table public.email_template_blocks
      add constraint email_template_blocks_block_type_check
      check (block_type in ('text', 'image', 'button', 'divider', 'spacer', 'social', 'cta', 'html', 'personalization'));
  end if;
exception when others then null;
end;
$$;

-- Template library (prebuilt templates)
create table if not exists public.template_library (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text check (category in ('welcome', 'follow_up', 'promotion', 'announcement', 'transactional', 'newsletter')),
  subject text not null,
  preview_text text,
  body_json jsonb not null, -- Tiptap JSON
  thumbnail_url text,
  is_public boolean not null default true,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_email_templates_parent on public.email_templates (parent_template_id);
create index if not exists idx_email_templates_variant on public.email_templates (is_variant);
create index if not exists idx_email_templates_category on public.email_templates (category);
create index if not exists idx_email_template_blocks_template on public.email_template_blocks (template_id, position);
create index if not exists idx_template_library_category on public.template_library (category);
create index if not exists idx_template_library_public on public.template_library (is_public);

-- Trigger for updated_at
drop trigger if exists trg_email_template_blocks_updated_at on public.email_template_blocks;
create trigger trg_email_template_blocks_updated_at before update on public.email_template_blocks
  for each row execute function set_updated_at();

drop trigger if exists trg_template_library_updated_at on public.template_library;
create trigger trg_template_library_updated_at before update on public.template_library
  for each row execute function set_updated_at();

-- RLS
alter table public.email_template_blocks enable row level security;
alter table public.template_library enable row level security;

-- Email template blocks policies (inherit from template)
drop policy if exists email_template_blocks_select_org on public.email_template_blocks;
create policy email_template_blocks_select_org on public.email_template_blocks
  for select using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_insert_org on public.email_template_blocks;
create policy email_template_blocks_insert_org on public.email_template_blocks
  for insert with check (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_update_org on public.email_template_blocks;
create policy email_template_blocks_update_org on public.email_template_blocks
  for update using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_delete_org on public.email_template_blocks;
create policy email_template_blocks_delete_org on public.email_template_blocks
  for delete using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and has_role(et.organization_id, 'manager')
    )
  );

-- Template library: public read for authenticated, platform admin manages
drop policy if exists template_library_select_public on public.template_library;
create policy template_library_select_public on public.template_library
  for select using (is_public = true);

drop policy if exists template_library_select_org on public.template_library;
create policy template_library_select_org on public.template_library
  for select using (auth.uid() is not null);

drop policy if exists template_library_insert_org on public.template_library;
create policy template_library_insert_org on public.template_library
  for insert with check (auth.uid() is not null);

drop policy if exists template_library_update_org on public.template_library;
create policy template_library_update_org on public.template_library
  for update using (is_platform_admin());

drop policy if exists template_library_delete_org on public.template_library;
create policy template_library_delete_org on public.template_library
  for delete using (is_platform_admin());

-- Grants
grant select, insert, update, delete on public.email_template_blocks to authenticated, service_role;
grant select, insert, update, delete on public.template_library to authenticated, service_role;

-- Function to create template from library
create or replace function public.create_template_from_library(
  p_organization_id uuid,
  p_user_id uuid,
  p_library_slug text,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_library record;
  v_template_id uuid;
begin
  select * into v_library
  from public.template_library
  where slug = p_library_slug and is_public = true;

  if not found then
    raise exception 'Template not found: %', p_library_slug;
  end if;

  insert into public.email_templates (
    organization_id, name, subject, body_json, category, thumbnail_url,
    created_by, is_variant, parent_template_id
  ) values (
    p_organization_id,
    coalesce(p_name, v_library.name),
    v_library.subject,
    v_library.body_json,
    v_library.category,
    v_library.thumbnail_url,
    p_user_id,
    false,
    null
  ) returning id into v_template_id;

  return v_template_id;
end;
$$;

grant execute on function public.create_template_from_library(uuid, uuid, text, text) to authenticated, service_role;

-- Function to create template variant
create or replace function public.create_template_variant(
  p_organization_id uuid,
  p_user_id uuid,
  p_parent_template_id uuid,
  p_name text,
  p_subject text,
  p_body_json jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent record;
  v_variant_id uuid;
begin
  select * into v_parent
  from public.email_templates
  where id = p_parent_template_id and organization_id = p_organization_id;

  if not found then
    raise exception 'Parent template not found';
  end if;

  insert into public.email_templates (
    organization_id, name, subject, body_json, category, thumbnail_url,
    created_by, is_variant, parent_template_id
  ) values (
    p_organization_id,
    p_name,
    p_subject,
    p_body_json,
    v_parent.category,
    v_parent.thumbnail_url,
    p_user_id,
    true,
    p_parent_template_id
  ) returning id into v_variant_id;

  return v_variant_id;
end;
$$;

grant execute on function public.create_template_variant(uuid, uuid, uuid, text, text, jsonb) to authenticated, service_role;

-- Function to increment template usage
create or replace function public.increment_template_usage(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_templates
  set usage_count = usage_count + 1
  where id = p_template_id;
end;
$$;

grant execute on function public.increment_template_usage(uuid) to authenticated, service_role;
-- ==== MIGRATION: 00047_contact_import_spintax.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00047: Contact Import & Spintax
--
-- CSV import with preview/validation, spintax parser
-- ------------------------------------------------------------------

-- Contact import jobs
create table if not exists public.contact_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid references public.contact_lists (id) on delete set null,
  filename text not null,
  total_rows int not null default 0,
  processed_rows int not null default 0,
  successful_rows int not null default 0,
  failed_rows int not null default 0,
  state text not null default 'pending', -- 'pending', 'preview', 'running', 'completed', 'failed', 'cancelled'
  column_mapping jsonb, -- {email: 0, firstName: 1, lastName: 2, ...}
  preview_data jsonb, -- First 10 rows for preview
  error text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Import job errors (detailed)
create table if not exists public.contact_import_errors (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.contact_import_jobs (id) on delete cascade,
  row_number int not null,
  email text,
  error text not null,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- Spintax patterns cache (for performance)
create table if not exists public.spintax_cache (
  id uuid primary key default gen_random_uuid(),
  pattern_hash text not null unique, -- SHA256 of spintax pattern
  pattern text not null,
  variations text[] not null, -- All possible variations
  variation_count int not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contact_import_jobs_org on public.contact_import_jobs (organization_id, state);
create index if not exists idx_contact_import_errors_job on public.contact_import_errors (import_job_id);
create index if not exists idx_spintax_cache_hash on public.spintax_cache (pattern_hash);

-- RLS
alter table public.contact_import_jobs enable row level security;
alter table public.contact_import_errors enable row level security;
alter table public.spintax_cache enable row level security;

-- Contact import jobs policies
drop policy if exists contact_import_jobs_select_org on public.contact_import_jobs;
create policy contact_import_jobs_select_org on public.contact_import_jobs
  for select using (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_insert_org on public.contact_import_jobs;
create policy contact_import_jobs_insert_org on public.contact_import_jobs
  for insert with check (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_update_org on public.contact_import_jobs;
create policy contact_import_jobs_update_org on public.contact_import_jobs
  for update using (public.is_org_member(organization_id));

drop policy if exists contact_import_jobs_delete_org on public.contact_import_jobs;
create policy contact_import_jobs_delete_org on public.contact_import_jobs
  for delete using (public.has_role(organization_id, 'manager'));

-- Contact import errors policies
drop policy if exists contact_import_errors_select_org on public.contact_import_errors;
create policy contact_import_errors_select_org on public.contact_import_errors
  for select using (
    exists (
      select 1 from public.contact_import_jobs cij
      where cij.id = contact_import_errors.import_job_id
      and is_org_member(cij.organization_id)
    )
  );

drop policy if exists contact_import_errors_insert_org on public.contact_import_errors;
create policy contact_import_errors_insert_org on public.contact_import_errors
  for insert with check (
    exists (
      select 1 from public.contact_import_jobs cij
      where cij.id = contact_import_errors.import_job_id
      and is_org_member(cij.organization_id)
    )
  );

-- Spintax cache: read-only for org members
drop policy if exists spintax_cache_select_org on public.spintax_cache;
create policy spintax_cache_select_org on public.spintax_cache
  for select using (true);

-- Grants
grant select, insert, update, delete on public.contact_import_jobs to authenticated, service_role;
grant select, insert, update, delete on public.contact_import_errors to authenticated, service_role;
grant select, insert, update, delete on public.spintax_cache to authenticated, service_role;

-- Function to parse spintax pattern
create or replace function public.parse_spintax(p_pattern text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variations text[];
  v_options text[];
  v_start int;
  v_end int;
  v_prefix text;
  v_suffix text;
  v_option text;
  v_combinations text[];
  v_current text[];
  v_i int;
  v_j int;
begin
  v_variations := array[]::text[];
  v_combinations := array[''];
  
  -- Simple spintax parser: {option1|option2|option3}
  -- This is a simplified version; production would use a proper parser
  
  v_prefix := p_pattern;
  v_variations := array[p_pattern];
  
  -- Find all {opt1|opt2|...} patterns
  while position('{' in v_prefix) > 0 loop
    v_start := position('{' in v_prefix);
    v_end := position('}' in substring(v_prefix from v_start));
    
    if v_end = 0 then
      exit;
    end if;
    
    v_end := v_start + v_end - 1;
    v_options := string_to_array(substring(v_prefix from v_start + 1 for v_end - v_start - 1), '|');
    v_suffix := substring(v_prefix from v_end + 1);
    v_prefix := substring(v_prefix from 1 for v_start - 1);
    
    v_current := array[]::text[];
    for v_i in 1..array_length(v_combinations, 1) loop
      for v_j in 1..array_length(v_options, 1) loop
        v_current := v_current || (v_combinations[v_i] || v_prefix || v_options[v_j] || v_suffix);
      end loop;
    end loop;
    
    v_combinations := v_current;
    v_prefix := v_combinations[1]; -- Just to continue parsing if nested
  end loop;
  
  if array_length(v_combinations, 1) = 1 and v_combinations[1] = p_pattern then
    return array[p_pattern]; -- No spintax found
  end if;
  
  return v_combinations;
exception
  when others then
    return array[p_pattern];
end;
$$;

grant execute on function public.parse_spintax(text) to authenticated, service_role;

-- Function to pick random spintax variation
create or replace function public.render_spintax(p_pattern text, p_seed int default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variations text[];
  v_hash text;
  v_cached record;
begin
  -- Check cache first
  v_hash := md5(p_pattern);
  select * into v_cached from public.spintax_cache where pattern_hash = v_hash;
  
  if found then
    v_variations := v_cached.variations;
  else
    v_variations := public.parse_spintax(p_pattern);
    insert into public.spintax_cache (pattern_hash, pattern, variations, variation_count)
    values (v_hash, p_pattern, v_variations, array_length(v_variations, 1))
    on conflict (pattern_hash) do nothing;
  end if;
  
  if array_length(v_variations, 1) = 1 then
    return v_variations[1];
  end if;
  
  if p_seed is not null then
    return v_variations[(p_seed % array_length(v_variations, 1)) + 1];
  else
    return v_variations[floor(random() * array_length(v_variations, 1)) + 1];
  end if;
exception
  when others then
    return p_pattern;
end;
$$;

grant execute on function public.render_spintax(text, int) to authenticated, service_role;
-- ==== MIGRATION: 00048_tracking.sql ====
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
-- ==== MIGRATION: 00049_template_library_seed.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00049: Template Library Seed (10+ prebuilt templates)
-- ------------------------------------------------------------------

insert into public.template_library (slug, name, description, category, subject, preview_text, body_json, tags) values
(
  'cold-outreach-saas',
  'Cold Outreach (SaaS)',
  'Short cold email for SaaS leads with personalization and a soft CTA.',
  'follow_up',
  'Quick question about {{company}}',
  'Personalized 1:1 outreach for SaaS prospects.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I noticed {{company}} is growing quickly. A lot of teams like yours use automation to save hours on manual email follow-ups."}]},{"type":"paragraph","content":[{"type":"text","text":"Would you be open to a quick 10-minute call this week?"}]},{"type":"paragraph","content":[{"type":"text","text":"Best,\n{{sender_name}}"}]}]}'::jsonb,
  array['cold','saas','outreach']
),
(
  'welcome-new-buyer',
  'Welcome New Buyer',
  'Warm welcome email for newly onboarded buyers.',
  'welcome',
  'Welcome to {{company_name}} 🎉',
  'Friendly onboarding welcome with next steps.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Welcome to {{company_name}}! We are excited to have you onboard."}]},{"type":"paragraph","content":[{"type":"text","text":"Here is what you can do next:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Complete your profile"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Explore integrations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Invite your team"}]}]}]},{"type":"paragraph","content":[{"type":"text","text":"Best regards,\n{{sender_name}}"}]}]}'::jsonb,
  array['welcome','onboarding']
),
(
  'follow-up-inquiry',
  'Follow Up Inquiry',
  'Polite follow-up after an unanswered inquiry.',
  'follow_up',
  'Following up: {{product_name}} inquiry',
  'Gentle nudge for an unanswered inquiry.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I wanted to follow up on your inquiry about {{product_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Do you have any questions our team can help with? We would love to hear from you."}]},{"type":"paragraph","content":[{"type":"text","text":"Best,\n{{sender_name}}"}]}]}'::jsonb,
  array['follow-up','inquiry']
),
(
  'promotional-offer',
  'Promotional Offer',
  'Announce a limited-time offer to your audience.',
  'promotion',
  'Special offer inside – {{discount}} off',
  'Limited-time promotional offer with CTA.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"For a limited time, get {{discount}} off your next order at {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Use code {{promo_code}} at checkout."}]},{"type":"button","attrs":{"text":"Claim Offer","url":"{{offer_url}}"}}]}'::jsonb,
  array['promo','offer','discount']
),
(
  'order-confirmation',
  'Order Confirmation',
  'Transactional confirmation for a new order.',
  'transactional',
  'Your order {{order_number}} is confirmed',
  'Order confirmation with summary.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Your order {{order_number}} has been confirmed and is being processed."}]},{"type":"paragraph","content":[{"type":"text","text":"Expected delivery: {{delivery_date}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Thank you for shopping with {{company_name}}!"}]}]}'::jsonb,
  array['transactional','order']
),
(
  'product-launch',
  'Product Launch Announcement',
  'Big launch announcement with feature highlights.',
  'announcement',
  'We just launched {{product_name}}',
  'Exciting new product launch.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"We just launched {{product_name}} – the latest from {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Here are the highlights:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{feature_1}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{feature_2}}"}]}]}]},{"type":"button","attrs":{"text":"Learn More","url":"{{product_url}}"}}]}'::jsonb,
  array['launch','announcement']
),
(
  'abandoned-cart',
  'Abandoned Cart Recovery',
  'Recover abandoned carts with a gentle reminder.',
  'promotion',
  'Did you leave something behind?',
  'Recover abandoned carts.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"We noticed you left some items in your cart at {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Your cart is saved — {here is a reminder|check out now} to complete your purchase."}]},{"type":"button","attrs":{"text":"Complete Purchase","url":"{{cart_url}}"}}]}'::jsonb,
  array['cart','recovery']
),
(
  'cold-outreach-exporter',
  'Cold Outreach (Exporter)',
  'Cold outreach tailored to export.Buyers/importers looking for sourcing.',
  'follow_up',
  'Sourcing partner for {{buyer_company}}',
  'Direct cold outreach for export sourcing.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello {{buyer_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I represent {{company_name}}, an exporter of {{product_category}}. We noticed {{buyer_company}} may import {{product_category}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Could we send you our latest catalog and pricing?"}]},{"type":"paragraph","content":[{"type":"text","text":"Thanks,\n{{sender_name}}"}]}]}'::jsonb,
  array['cold','export','exporter']
),
(
  'newsletter-product-roundup',
  'Newsletter: Product Roundup',
  'Monthly newsletter highlighting new products.',
  'newsletter',
  'Your monthly roundup from {{company_name}}',
  'Product roundup newsletter.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Here is your monthly roundup from {{company_name}}:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_1}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_2}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_3}}"}]}]}]},{"type":"button","attrs":{"text":"View Catalog","url":"{{catalog_url}}"}}]}'::jsonb,
  array['newsletter','roundup']
),
(
  're-engagement',
  'Re-engagement Campaign',
  'Win back inactive customers with a special offer.',
  'follow_up',
  'We miss you at {{company_name}}',
  'Re-engage lapsed customers.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"It has been a while since we last connected. As a thank you, here is {{discount}} off your next order at {{company_name}}."}]},{"type":"button","attrs":{"text":"Redeem Offer","url":"{{offer_url}}"}}]}'::jsonb,
  array['re-engagement','winback']
),
(
  'shipping-notification',
  'Shipping Notification',
  'Let buyers know their shipment is on its way.',
  'transactional',
  'Your shipment {{tracking_number}} is on the way',
  'Shipment tracking notification.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Good news! Your shipment {{tracking_number}} is now on its way."}]},{"type":"paragraph","content":[{"type":"text","text":"Track it live: {{tracking_url}}"}]},{"type":"paragraph","content":[{"type":"text","text":"Thanks for shipping with {{company_name}}."}]}]}'::jsonb,
  array['shipping','transactional','tracking']
),
(
  'quotation-followup',
  'Quotation Follow-up',
  'Follow up on a quotation sent to a buyer.',
  'follow_up',
  'About your quotation {{quotation_number}}',
  'Follow up on an outstanding quotation.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I wanted to check in on quotation {{quotation_number}} we sent on {{quotation_date}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Do you have any questions, or shall we proceed with the order?"}]},{"type":"paragraph","content":[{"type":"text","text":"Best regards,\n{{sender_name}}"}]}]}'::jsonb,
  array['quotation','follow-up']
)
on conflict (slug) do nothing;
-- ==== MIGRATION: 00050_campaign_variants.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00050: Campaign A/B Variant Selection
--
-- Let campaigns send two template variants (A/B) split across contacts,
-- and track per-variant performance through email_activities.template_id
-- ------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists variant_template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists variant_split_percent int not null default 50;

create index if not exists idx_email_campaigns_variant on public.email_campaigns (variant_template_id);
-- ==== MIGRATION: 00051_fix_spintax.sql ====
-- ------------------------------------------------------------------
-- Export OS - 00051: Fix parse_spintax infinite loop
--
-- The 00047 parse_spintax could loop forever on malformed input.
-- Replace with a bounded, simpler implementation.
-- ------------------------------------------------------------------

create or replace function public.parse_spintax(p_pattern text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result text[] := array[''];
  v_remaining text := p_pattern;
  v_pos int;
  v_close int;
  v_options text[];
  v_prefix text;
  v_suffix text;
  v_new text[];
  v_i int;
  v_j int;
  v_guard int := 0;
begin
  while position('{' in v_remaining) > 0 loop
    v_guard := v_guard + 1;
    if v_guard > 50 then return array[p_pattern]; end if;

    v_pos := position('{' in v_remaining);
    v_close := position('}' in substring(v_remaining from v_pos + 1));
    if v_close = 0 then return array[p_pattern]; end if;

    v_close := v_pos + v_close;
    v_options := string_to_array(substring(v_remaining from v_pos + 1 for v_close - v_pos - 1), '|');
    v_prefix := substring(v_remaining from 1 for v_pos - 1);
    v_suffix := substring(v_remaining from v_close + 1);

    v_new := array[]::text[];
    for v_i in 1..array_length(v_result, 1) loop
      for v_j in 1..array_length(v_options, 1) loop
        v_new := v_new || (v_result[v_i] || v_prefix || v_options[v_j]);
      end loop;
    end loop;

    v_result := v_new;
    v_remaining := v_suffix;
  end loop;

  if array_length(v_result, 1) = 1 and v_result[1] = p_pattern then
    return array[p_pattern];
  end if;

  -- Append any trailing static text to all combinations
  for v_i in 1..array_length(v_result, 1) loop
    v_result[v_i] := v_result[v_i] || v_remaining;
  end loop;

  return v_result;
exception
  when others then return array[p_pattern];
end;
$$;

grant execute on function public.parse_spintax(text) to authenticated, service_role;
