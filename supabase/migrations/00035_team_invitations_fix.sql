-- ------------------------------------------------------------------
-- Export OS - 00035: Fix team invitations flow
-- ------------------------------------------------------------------

-- Allow org members to read basic profile info of their teammates
-- (needed for the team page member list join)
drop policy if exists profiles_select_org_mate on public.profiles;
create policy profiles_select_org_mate on public.profiles
  for select using (
    exists (
      select 1
      from public.organization_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.organization_id in (
          select m2.organization_id
          from public.organization_members m2
          where m2.user_id = profiles.id
            and m2.status = 'active'
        )
    )
  );

-- Security definer function to accept an invitation by token.
-- Runs as the function owner (bypasses RLS) so the invitee can accept
-- before they are a member. Validates token, status, expiry and email.
create or replace function public.accept_org_invitation(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.organization_invitations%rowtype;
begin
  select * into v_inv
  from public.organization_invitations
  where token = p_token::uuid
    and status = 'pending'
  limit 1;

  if not found then
    raise exception 'Invalid or expired invitation token';
  end if;

  if v_inv.expires_at < now() then
    update public.organization_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation has expired';
  end if;

  if lower(v_inv.email) <> lower(p_user_email) then
    raise exception 'Invitation email does not match your account';
  end if;

  update public.organization_invitations
  set status = 'accepted'
  where id = v_inv.id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_inv.organization_id, p_user_id, v_inv.role, 'active')
  on conflict (organization_id, user_id)
  do update set role = excluded.role, status = 'active', updated_at = now();

  return v_inv.organization_id;
end;
$$;

revoke all on function public.accept_org_invitation(text, uuid, text) from public;
grant execute on function public.accept_org_invitation(text, uuid, text) to authenticated;
