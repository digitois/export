-- ------------------------------------------------------------------
-- Export OS - 00033: CRM Depth — Pipeline Stages + Follow-ups/Reminders
-- ------------------------------------------------------------------

-- Customizable pipeline stages per organization
create table if not exists public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#3b82f6',  -- hex color for kanban column
  sort_order int not null default 0,
  is_default boolean not null default false,
  is_won boolean not null default false,    -- marks "won" stage
  is_lost boolean not null default false,   -- marks "lost" stage
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

drop trigger if exists trg_lead_stages_updated_at on public.lead_stages;
create trigger trg_lead_stages_updated_at before update on public.lead_stages
  for each row execute function set_updated_at();

create index if not exists idx_lead_stages_org on public.lead_stages (organization_id);

-- Add stage_id to leads (nullable, for custom pipeline; status enum remains for backward compat)
alter table public.leads add column if not exists stage_id uuid references public.lead_stages (id) on delete set null;
create index if not exists idx_leads_stage on public.leads (stage_id);

-- Follow-ups are already in lead_follow_ups (migration 00006).
-- Add a simple done flag and reminder notification tracking.
alter table public.lead_follow_ups add column if not exists done boolean not null default false;
alter table public.lead_follow_ups add column if not exists reminder_sent_at timestamptz;
alter table public.lead_follow_ups add column if not exists notification_channels text[] not null default '{}'; -- e.g., '{email,in_app}'

-- Reminders: scheduled notifications for follow-ups (surfacing on dashboard)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  follow_up_id uuid references public.lead_follow_ups (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  description text,
  remind_at timestamptz not null,
  is_read boolean not null default false,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_reminders_updated_at on public.reminders;
-- no updated_at column for reminders; use created_at

create index if not exists idx_reminders_org on public.reminders (organization_id);
create index if not exists idx_reminders_user on public.reminders (user_id);
create index if not exists idx_reminders_remind_at on public.reminders (remind_at);
create index if not exists idx_reminders_unread on public.reminders (user_id, is_read, is_dismissed) where is_read = false and is_dismissed = false;

-- Optional: contracts (simple link to lead + document reference)
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  document_url text,
  status text not null default 'draft', -- draft, sent, signed, expired
  signed_at timestamptz,
  expires_at timestamptz,
  value numeric(18, 4),
  currency char(3) not null default 'USD',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function set_updated_at();

create index if not exists idx_contracts_org on public.contracts (organization_id);
create index if not exists idx_contracts_lead on public.contracts (lead_id);

alter table public.lead_stages enable row level security;
alter table public.reminders enable row level security;
alter table public.contracts enable row level security;

-- lead_stages policies
drop policy if exists lead_stages_select_org on public.lead_stages;
create policy lead_stages_select_org on public.lead_stages
  for select using (public.is_org_member(organization_id));
drop policy if exists lead_stages_insert_org on public.lead_stages;
create policy lead_stages_insert_org on public.lead_stages
  for insert with check (public.is_org_member(organization_id));
drop policy if exists lead_stages_update_org on public.lead_stages;
create policy lead_stages_update_org on public.lead_stages
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists lead_stages_delete_org on public.lead_stages;
create policy lead_stages_delete_org on public.lead_stages
  for delete using (public.has_role(organization_id, 'manager'));

-- reminders policies (user sees their own reminders)
drop policy if exists reminders_select_own on public.reminders;
create policy reminders_select_own on public.reminders
  for select using (user_id = auth.uid());
drop policy if exists reminders_insert_org on public.reminders;
create policy reminders_insert_org on public.reminders
  for insert with check (public.is_org_member(organization_id));
drop policy if exists reminders_update_own on public.reminders;
create policy reminders_update_own on public.reminders
  for update using (user_id = auth.uid());
drop policy if exists reminders_delete_own on public.reminders;
create policy reminders_delete_own on public.reminders
  for delete using (user_id = auth.uid());

-- contracts policies
drop policy if exists contracts_select_org on public.contracts;
create policy contracts_select_org on public.contracts
  for select using (public.is_org_member(organization_id));
drop policy if exists contracts_insert_org on public.contracts;
create policy contracts_insert_org on public.contracts
  for insert with check (public.is_org_member(organization_id));
drop policy if exists contracts_update_org on public.contracts;
create policy contracts_update_org on public.contracts
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists contracts_delete_org on public.contracts;
create policy contracts_delete_org on public.contracts
  for delete using (public.has_role(organization_id, 'manager'));

-- Seed default pipeline stages for existing orgs (idempotent)
do $$
declare
  org_rec record;
  stages constant text[][] := array[
    array['New', '#64748b', '0', 'true', 'false', 'false'],
    array['Contacted', '#0ea5e9', '1', 'false', 'false', 'false'],
    array['Qualified', '#22c55e', '2', 'false', 'false', 'false'],
    array['Proposal Sent', '#f59e0b', '3', 'false', 'false', 'false'],
    array['Negotiation', '#8b5cf6', '4', 'false', 'false', 'false'],
    array['Won', '#16a34a', '5', 'false', 'true', 'false'],
    array['Lost', '#dc2626', '6', 'false', 'false', 'true']
  ];
  i int;
begin
  for org_rec in select id, created_by from public.organizations loop
    for i in 1..array_length(stages, 1) loop
      insert into public.lead_stages (organization_id, name, color, sort_order, is_default, is_won, is_lost, created_by)
      values (org_rec.id, stages[i][1], stages[i][2], stages[i][3]::int, stages[i][4]::boolean, stages[i][5]::boolean, stages[i][6]::boolean, org_rec.created_by)
      on conflict (organization_id, name) do nothing;
    end loop;
  end loop;
end $$;