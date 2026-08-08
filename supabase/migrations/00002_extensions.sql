-- ------------------------------------------------------------------
-- Export OS - 00001: Extensions & helper functions
-- ------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Generic trigger functions
-- ------------------------------------------------------------------

-- Auto-manage created_at / updated_at
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-fill created_at when not provided
create or replace function set_created_at()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at = now();
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Tenant membership helpers (used by RLS policies)
-- ------------------------------------------------------------------

-- Is the current user an active member of the organization?
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) into v_exists;
  return v_exists;
end;
$$;

-- Role of the current user inside an organization
create or replace function public.current_org_role(p_org_id uuid)
returns public.member_role
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  select m.role
  into v_role
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
    and m.status = 'active';
  return v_role;
end;
$$;

-- Is the current user at least the given role (owner > admin > manager > employee)
create or replace function public.has_role(p_org_id uuid, p_min_role public.member_role)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  select m.role into v_role
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
    and m.status = 'active';
  if v_role is null then
    return false;
  end if;
  case v_role
    when 'owner'  then return true;
    when 'admin'  then return p_min_role in ('admin', 'manager', 'employee');
    when 'manager' then return p_min_role in ('manager', 'employee');
    when 'employee' then return p_min_role = 'employee';
    else return false;
  end case;
end;
$$;

-- ------------------------------------------------------------------
-- Audit helper
-- ------------------------------------------------------------------

-- Insert an audit log entry
create or replace function public.write_audit(
  p_organization_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    organization_id, user_id, action, entity_type, entity_id, meta, ip
  ) values (
    p_organization_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_meta,
    nullif(current_setting('request.headers', true), '')::jsonb #>> '{x-forwarded-for}'
  );
end;
$$;
