-- ------------------------------------------------------------------
-- Export OS - 00017: Notifications, Activity, Audit
-- ------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);
create index if not exists idx_notifications_org on public.notifications (organization_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id),
  type public.activity_type not null default 'created',
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_org on public.activity_logs (organization_id, created_at desc);
create index if not exists idx_activity_logs_entity on public.activity_logs (entity_type, entity_id);

create table if not exists public.audit_logs (
  id bigserial primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org on public.audit_logs (organization_id, created_at desc);
create index if not exists idx_audit_logs_user on public.audit_logs (user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- Organization-level settings (key/value)
create table if not exists public.organization_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, key)
);

-- Trigger on member creation -> create default org settings
create or replace function public.bootstrap_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_settings (organization_id, key, value)
  values (new.id, 'inquiry_notifications', 'true'::jsonb)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_bootstrap_org on public.organizations;
create trigger trg_bootstrap_org after insert on public.organizations
  for each row execute function public.bootstrap_organization();

alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organization_settings enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid());
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

drop policy if exists activity_logs_select_org on public.activity_logs;
create policy activity_logs_select_org on public.activity_logs
  for select using (public.is_org_member(organization_id));
drop policy if exists activity_logs_insert_org on public.activity_logs;
create policy activity_logs_insert_org on public.activity_logs
  for insert with check (public.is_org_member(organization_id));

drop policy if exists audit_logs_select_org on public.audit_logs;
create policy audit_logs_select_org on public.audit_logs
  for select using (
    public.has_role(organization_id, 'admin')
    or user_id = auth.uid()
  );
drop policy if exists audit_logs_insert_org on public.audit_logs;
create policy audit_logs_insert_org on public.audit_logs
  for insert with check (public.is_org_member(organization_id));

drop policy if exists organization_settings_select_org on public.organization_settings;
create policy organization_settings_select_org on public.organization_settings
  for select using (public.is_org_member(organization_id));
drop policy if exists organization_settings_update_org on public.organization_settings;
create policy organization_settings_update_org on public.organization_settings
  for update using (public.has_role(organization_id, 'admin'));
