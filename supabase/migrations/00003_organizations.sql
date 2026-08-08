-- ------------------------------------------------------------------
-- Export OS - 00003: Users, Organizations, Memberships, Invitations
-- ------------------------------------------------------------------

-- User profiles (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------
-- Organizations (tenants)
-- ------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_subdomain text unique,
  status public.org_status not null default 'trial',
  plan_id uuid,
  trial_ends_at timestamptz,
  billing_email text,
  default_currency char(3) not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function set_updated_at();

create index if not exists idx_organizations_slug on public.organizations (slug);
create index if not exists idx_organizations_subdomain on public.organizations (website_subdomain);
create index if not exists idx_organizations_status on public.organizations (status);

-- ------------------------------------------------------------------
-- Memberships (RBAC)
-- ------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'employee',
  status text not null default 'active', -- active | invited
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

drop trigger if exists trg_org_members_updated_at on public.organization_members;
create trigger trg_org_members_updated_at before update on public.organization_members
  for each row execute function set_updated_at();

create index if not exists idx_org_members_org on public.organization_members (organization_id);
create index if not exists idx_org_members_user on public.organization_members (user_id);

-- ------------------------------------------------------------------
-- Invitations
-- ------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.member_role not null default 'employee',
  token text not null unique,
  invited_by uuid not null references public.profiles (id),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_org on public.invitations (organization_id);
create index if not exists idx_invitations_email on public.invitations (email);
create index if not exists idx_invitations_token on public.invitations (token);

-- ------------------------------------------------------------------
-- RLS Policies
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;

-- profiles: users can read/update their own profile
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- organizations: visible to any member
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select using (public.is_org_member(id));
drop policy if exists organizations_update_member on public.organizations;
create policy organizations_update_member on public.organizations
  for update using (public.has_role(id, 'admin'));

-- members: members can view membership of their org, only admins mutate
drop policy if exists members_select_org on public.organization_members;
create policy members_select_org on public.organization_members
  for select using (public.is_org_member(organization_id));
drop policy if exists members_insert_admin on public.organization_members;
create policy members_insert_admin on public.organization_members
  for insert with check (public.has_role(organization_id, 'admin'));
drop policy if exists members_update_admin on public.organization_members;
create policy members_update_admin on public.organization_members
  for update using (public.has_role(organization_id, 'admin'));
drop policy if exists members_delete_admin on public.organization_members;
create policy members_delete_admin on public.organization_members
  for delete using (public.has_role(organization_id, 'admin'));

-- invitations: members read, admins manage
drop policy if exists invitations_select_org on public.invitations;
create policy invitations_select_org on public.invitations
  for select using (public.is_org_member(organization_id));
drop policy if exists invitations_insert_admin on public.invitations;
create policy invitations_insert_admin on public.invitations
  for insert with check (public.has_role(organization_id, 'admin'));
drop policy if exists invitations_update_admin on public.invitations;
create policy invitations_update_admin on public.invitations
  for update using (public.has_role(organization_id, 'admin'));
drop policy if exists invitations_delete_admin on public.invitations;
create policy invitations_delete_admin on public.invitations
  for delete using (public.has_role(organization_id, 'admin'));
