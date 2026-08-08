-- ------------------------------------------------------------------
-- Export OS - 00016: Support Tickets, Feature Flags, Announcements
-- ------------------------------------------------------------------

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  subject text not null,
  description text not null,
  category text not null default 'general',
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  assigned_to uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at before update on public.support_tickets
  for each row execute function set_updated_at();

create index if not exists idx_support_tickets_org on public.support_tickets (organization_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  user_id uuid references public.profiles (id),
  body text not null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket on public.support_messages (ticket_id);

-- Feature flags (global platform toggles)
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  rollout_percent int not null default 100,
  description text,
  updated_at timestamptz not null default now()
);

-- Announcements (platform-wide)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text not null default 'info', -- info | warning | success
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.feature_flags enable row level security;
alter table public.announcements enable row level security;

drop policy if exists support_tickets_select_org on public.support_tickets;
create policy support_tickets_select_org on public.support_tickets
  for select using (
    (organization_id is not null and public.is_org_member(organization_id))
    or user_id = auth.uid()
  );
drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert with check (user_id = auth.uid());
drop policy if exists support_tickets_update_org on public.support_tickets;
create policy support_tickets_update_org on public.support_tickets
  for update using (
    (organization_id is not null and public.is_org_member(organization_id))
    or user_id = auth.uid()
  );

drop policy if exists support_messages_select_org on public.support_messages;
create policy support_messages_select_org on public.support_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and ((t.organization_id is not null and public.is_org_member(t.organization_id))
             or t.user_id = auth.uid())
    )
  );
drop policy if exists support_messages_insert_own on public.support_messages;
create policy support_messages_insert_own on public.support_messages
  for insert with check (user_id = auth.uid());

drop policy if exists feature_flags_select_public on public.feature_flags;
create policy feature_flags_select_public on public.feature_flags
  for select using (true);

drop policy if exists announcements_select_public on public.announcements;
create policy announcements_select_public on public.announcements
  for select using (is_active = true and now() between starts_at and coalesce(ends_at, now()));
