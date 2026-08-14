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