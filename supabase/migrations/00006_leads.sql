-- ------------------------------------------------------------------
-- Export OS - 00006: Leads CRM
-- ------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_name text,
  buyer_name text not null,
  email text,
  phone text,
  country text,
  product_interested text,
  lead_value numeric(18, 4),
  currency char(3) not null default 'USD',
  source public.lead_source not null default 'manual',
  priority public.lead_priority not null default 'medium',
  status public.lead_status not null default 'new',
  assigned_to uuid references public.profiles (id),
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function set_updated_at();

create index if not exists idx_leads_org on public.leads (organization_id);
create index if not exists idx_leads_org_status on public.leads (organization_id, status);
create index if not exists idx_leads_org_priority on public.leads (organization_id, priority);
create index if not exists idx_leads_org_source on public.leads (organization_id, source);
create index if not exists idx_leads_org_assigned on public.leads (organization_id, assigned_to);
create index if not exists idx_leads_org_created on public.leads (organization_id, created_at desc);
create index if not exists idx_leads_email on public.leads (organization_id, lower(email));

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid references public.profiles (id),
  type public.lead_activity_type not null default 'note',
  description text not null,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_org on public.lead_activities (organization_id);
create index if not exists idx_lead_activities_lead on public.lead_activities (lead_id);
create index if not exists idx_lead_activities_due on public.lead_activities (organization_id, due_at);

create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  scheduled_at timestamptz not null,
  reminder_type text not null default 'email',
  note text,
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_follow_ups_org on public.lead_follow_ups (organization_id);
create index if not exists idx_lead_follow_ups_lead on public.lead_follow_ups (lead_id);
create index if not exists idx_lead_follow_ups_scheduled on public.lead_follow_ups (scheduled_at);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_follow_ups enable row level security;

drop policy if exists leads_select_org on public.leads;
create policy leads_select_org on public.leads
  for select using (public.is_org_member(organization_id));
drop policy if exists leads_insert_org on public.leads;
create policy leads_insert_org on public.leads
  for insert with check (public.is_org_member(organization_id));
drop policy if exists leads_update_org on public.leads;
create policy leads_update_org on public.leads
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists leads_delete_org on public.leads;
create policy leads_delete_org on public.leads
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists lead_activities_select_org on public.lead_activities;
create policy lead_activities_select_org on public.lead_activities
  for select using (public.is_org_member(organization_id));
drop policy if exists lead_activities_insert_org on public.lead_activities;
create policy lead_activities_insert_org on public.lead_activities
  for insert with check (public.is_org_member(organization_id));
drop policy if exists lead_activities_update_org on public.lead_activities;
create policy lead_activities_update_org on public.lead_activities
  for update using (public.is_org_member(organization_id));
drop policy if exists lead_activities_delete_org on public.lead_activities;
create policy lead_activities_delete_org on public.lead_activities
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists lead_follow_ups_select_org on public.lead_follow_ups;
create policy lead_follow_ups_select_org on public.lead_follow_ups
  for select using (public.is_org_member(organization_id));
drop policy if exists lead_follow_ups_insert_org on public.lead_follow_ups;
create policy lead_follow_ups_insert_org on public.lead_follow_ups
  for insert with check (public.is_org_member(organization_id));
drop policy if exists lead_follow_ups_update_org on public.lead_follow_ups;
create policy lead_follow_ups_update_org on public.lead_follow_ups
  for update using (public.is_org_member(organization_id));
drop policy if exists lead_follow_ups_delete_org on public.lead_follow_ups;
create policy lead_follow_ups_delete_org on public.lead_follow_ups
  for delete using (public.has_role(organization_id, 'manager'));
