-- ------------------------------------------------------------------
-- Export OS - 00034: SaaS Platform — Org Switcher + White-label
-- ------------------------------------------------------------------

-- Add white-label settings to organizations
alter table public.organizations add column if not exists white_label_enabled boolean not null default false;
alter table public.organizations add column if not exists white_label_accent text;  -- hex color
alter table public.organizations add column if not exists white_label_logo_url text;
alter table public.organizations add column if not exists white_label_favicon_url text;
alter table public.organizations add column if not exists custom_domain text;  -- for custom domain white-label
alter table public.organizations add column if not exists custom_domain_verified boolean not null default false;

-- Add user's current organization context (for org switcher persistence)
alter table public.profiles add column if not exists current_organization_id uuid references public.organizations (id) on delete set null;
create index if not exists idx_profiles_current_org on public.profiles (current_organization_id);

-- Create organization memberships view for easy switching (already have organization_members table)
-- Just ensure the membership has a role and status

-- Add webhook secret for platform integrations (optional, for future)
alter table public.organizations add column if not exists webhook_secret text;

-- Index for custom domain lookups
create index if not exists idx_organizations_custom_domain on public.organizations (custom_domain) where custom_domain is not null;

-- Enable RLS on new columns (already enabled on organizations)

-- Note: The organizations table already has RLS via existing policies.
-- The new columns are automatically covered by existing RLS policies.

-- Organization invitations table (for team member invites)
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'employee',
  token uuid not null default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending',  -- pending, accepted, expired, revoked
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invitations_org on public.organization_invitations (organization_id);
create index if not exists idx_org_invitations_token on public.organization_invitations (token);
create index if not exists idx_org_invitations_email on public.organization_invitations (email);

alter table public.organization_invitations enable row level security;

drop policy if exists org_invitations_select_org on public.organization_invitations;
create policy org_invitations_select_org on public.organization_invitations
  for select using (public.is_org_member(organization_id));
drop policy if exists org_invitations_insert_org on public.organization_invitations;
create policy org_invitations_insert_org on public.organization_invitations
  for insert with check (public.is_org_member(organization_id));
drop policy if exists org_invitations_update_org on public.organization_invitations;
create policy org_invitations_update_org on public.organization_invitations
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists org_invitations_delete_org on public.organization_invitations;
create policy org_invitations_delete_org on public.organization_invitations
  for delete using (public.has_role(organization_id, 'manager'));