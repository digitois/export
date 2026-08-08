-- ------------------------------------------------------------------
-- Export OS - 00014: Email Marketing
-- ------------------------------------------------------------------

create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  contact_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contact_lists_updated_at on public.contact_lists;
create trigger trg_contact_lists_updated_at before update on public.contact_lists
  for each row execute function set_updated_at();

create index if not exists idx_contact_lists_org on public.contact_lists (organization_id);

create table if not exists public.email_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid references public.contact_lists (id) on delete cascade,
  email text not null,
  name text,
  company text,
  country text,
  unsubscribed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

drop trigger if exists trg_email_contacts_updated_at on public.email_contacts;
create trigger trg_email_contacts_updated_at before update on public.email_contacts
  for each row execute function set_updated_at();

create index if not exists idx_email_contacts_org on public.email_contacts (organization_id);
create index if not exists idx_email_contacts_list on public.email_contacts (list_id);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  is_system boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_templates_updated_at on public.email_templates;
create trigger trg_email_templates_updated_at before update on public.email_templates
  for each row execute function set_updated_at();

create index if not exists idx_email_templates_org on public.email_templates (organization_id);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  template_id uuid references public.email_templates (id) on delete set null,
  list_id uuid references public.contact_lists (id) on delete set null,
  status public.campaign_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count int not null default 0,
  sent_count int not null default 0,
  opened_count int not null default 0,
  clicked_count int not null default 0,
  unsubscribed_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_campaigns_updated_at on public.email_campaigns;
create trigger trg_email_campaigns_updated_at before update on public.email_campaigns
  for each row execute function set_updated_at();

create index if not exists idx_email_campaigns_org on public.email_campaigns (organization_id);
create index if not exists idx_email_campaigns_status on public.email_campaigns (organization_id, status);

create table if not exists public.email_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.email_campaigns (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete cascade,
  email text,
  event text not null, -- sent | opened | clicked | bounced | unsubscribed
  url text,
  ip text,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_email_activities_org on public.email_activities (organization_id);
create index if not exists idx_email_activities_campaign on public.email_activities (campaign_id);
create index if not exists idx_email_activities_org_event on public.email_activities (organization_id, event);

-- Email usage accounting (per org, per month)
create table if not exists public.email_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month text not null,
  emails_sent int not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, month)
);

alter table public.contact_lists enable row level security;
alter table public.email_contacts enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_activities enable row level security;
alter table public.email_usage enable row level security;

drop policy if exists contact_lists_select_org on public.contact_lists;
create policy contact_lists_select_org on public.contact_lists
  for select using (public.is_org_member(organization_id));
drop policy if exists contact_lists_insert_org on public.contact_lists;
create policy contact_lists_insert_org on public.contact_lists
  for insert with check (public.is_org_member(organization_id));
drop policy if exists contact_lists_update_org on public.contact_lists;
create policy contact_lists_update_org on public.contact_lists
  for update using (public.is_org_member(organization_id));
drop policy if exists contact_lists_delete_org on public.contact_lists;
create policy contact_lists_delete_org on public.contact_lists
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists email_contacts_select_org on public.email_contacts;
create policy email_contacts_select_org on public.email_contacts
  for select using (public.is_org_member(organization_id));
drop policy if exists email_contacts_insert_org on public.email_contacts;
create policy email_contacts_insert_org on public.email_contacts
  for insert with check (public.is_org_member(organization_id));
drop policy if exists email_contacts_update_org on public.email_contacts;
create policy email_contacts_update_org on public.email_contacts
  for update using (public.is_org_member(organization_id));
drop policy if exists email_contacts_delete_org on public.email_contacts;
create policy email_contacts_delete_org on public.email_contacts
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists email_templates_select_org on public.email_templates;
create policy email_templates_select_org on public.email_templates
  for select using (public.is_org_member(organization_id));
drop policy if exists email_templates_insert_org on public.email_templates;
create policy email_templates_insert_org on public.email_templates
  for insert with check (public.is_org_member(organization_id));
drop policy if exists email_templates_update_org on public.email_templates;
create policy email_templates_update_org on public.email_templates
  for update using (public.is_org_member(organization_id));
drop policy if exists email_templates_delete_org on public.email_templates;
create policy email_templates_delete_org on public.email_templates
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists email_campaigns_select_org on public.email_campaigns;
create policy email_campaigns_select_org on public.email_campaigns
  for select using (public.is_org_member(organization_id));
drop policy if exists email_campaigns_insert_org on public.email_campaigns;
create policy email_campaigns_insert_org on public.email_campaigns
  for insert with check (public.is_org_member(organization_id));
drop policy if exists email_campaigns_update_org on public.email_campaigns;
create policy email_campaigns_update_org on public.email_campaigns
  for update using (public.is_org_member(organization_id));
drop policy if exists email_campaigns_delete_org on public.email_campaigns;
create policy email_campaigns_delete_org on public.email_campaigns
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists email_activities_select_org on public.email_activities;
create policy email_activities_select_org on public.email_activities
  for select using (public.is_org_member(organization_id));

drop policy if exists email_usage_select_org on public.email_usage;
create policy email_usage_select_org on public.email_usage
  for select using (public.is_org_member(organization_id));
