-- ------------------------------------------------------------------
-- Export OS - 00026: Platform Admin (Master Admin Panel)
--
-- Adds an is_platform_admin flag on profiles plus RLS policies so a
-- flagged user can read/write across ALL tenants (organizations, plans,
-- subscriptions, payments, support tickets, feature flags, announcements,
-- audit logs). Gated via a security definer helper so only the user's
-- own flag is checked, never leaked in a join.
-- ------------------------------------------------------------------

alter table public.profiles add column if not exists is_platform_admin boolean not null default false;

-- Helper: is the current authenticated user a platform admin?
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_platform_admin = true
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- ------------------------------------------------------------------
-- Organizations
-- ------------------------------------------------------------------
drop policy if exists organizations_select_admin on public.organizations;
create policy organizations_select_admin on public.organizations
  for select using (public.is_platform_admin());
drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update using (public.is_platform_admin());
drop policy if exists organizations_insert_admin on public.organizations;
create policy organizations_insert_admin on public.organizations
  for insert with check (public.is_platform_admin());
drop policy if exists organizations_delete_admin on public.organizations;
create policy organizations_delete_admin on public.organizations
  for delete using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Profiles (platform admins may read/update any profile)
-- ------------------------------------------------------------------
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_platform_admin());
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Organization members (admin reads)
-- ------------------------------------------------------------------
drop policy if exists members_select_admin on public.organization_members;
create policy members_select_admin on public.organization_members
  for select using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Plans (admin CRUD)
-- ------------------------------------------------------------------
drop policy if exists plans_insert_admin on public.plans;
create policy plans_insert_admin on public.plans
  for insert with check (public.is_platform_admin());
drop policy if exists plans_update_admin on public.plans;
create policy plans_update_admin on public.plans
  for update using (public.is_platform_admin());
drop policy if exists plans_delete_admin on public.plans;
create policy plans_delete_admin on public.plans
  for delete using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Subscriptions (admin read/update)
-- ------------------------------------------------------------------
drop policy if exists subscriptions_select_admin on public.subscriptions;
create policy subscriptions_select_admin on public.subscriptions
  for select using (public.is_platform_admin());
drop policy if exists subscriptions_update_admin_all on public.subscriptions;
create policy subscriptions_update_admin_all on public.subscriptions
  for update using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Payments (admin read)
-- ------------------------------------------------------------------
drop policy if exists payments_select_admin on public.payments;
create policy payments_select_admin on public.payments
  for select using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Support tickets & messages (admin read/update/insert)
-- ------------------------------------------------------------------
drop policy if exists support_tickets_select_admin on public.support_tickets;
create policy support_tickets_select_admin on public.support_tickets
  for select using (public.is_platform_admin());
drop policy if exists support_tickets_update_admin on public.support_tickets;
create policy support_tickets_update_admin on public.support_tickets
  for update using (public.is_platform_admin());

drop policy if exists support_messages_select_admin on public.support_messages;
create policy support_messages_select_admin on public.support_messages
  for select using (public.is_platform_admin());
drop policy if exists support_messages_insert_admin on public.support_messages;
create policy support_messages_insert_admin on public.support_messages
  for insert with check (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Feature flags (admin manage)
-- ------------------------------------------------------------------
drop policy if exists feature_flags_select_admin on public.feature_flags;
create policy feature_flags_select_admin on public.feature_flags
  for select using (public.is_platform_admin());
drop policy if exists feature_flags_insert_admin on public.feature_flags;
create policy feature_flags_insert_admin on public.feature_flags
  for insert with check (public.is_platform_admin());
drop policy if exists feature_flags_update_admin on public.feature_flags;
create policy feature_flags_update_admin on public.feature_flags
  for update using (public.is_platform_admin());
drop policy if exists feature_flags_delete_admin on public.feature_flags;
create policy feature_flags_delete_admin on public.feature_flags
  for delete using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Announcements (admin manage; public policy only sees active ones)
-- ------------------------------------------------------------------
drop policy if exists announcements_select_admin on public.announcements;
create policy announcements_select_admin on public.announcements
  for select using (public.is_platform_admin());
drop policy if exists announcements_insert_admin on public.announcements;
create policy announcements_insert_admin on public.announcements
  for insert with check (public.is_platform_admin());
drop policy if exists announcements_update_admin on public.announcements;
create policy announcements_update_admin on public.announcements
  for update using (public.is_platform_admin());
drop policy if exists announcements_delete_admin on public.announcements;
create policy announcements_delete_admin on public.announcements
  for delete using (public.is_platform_admin());

-- ------------------------------------------------------------------
-- Audit logs (admin read)
-- ------------------------------------------------------------------
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
  for select using (public.is_platform_admin());
