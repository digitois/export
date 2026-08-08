-- ------------------------------------------------------------------
-- Export OS - 00021: Email tracking RPC (open/click/unsubscribe)
-- ------------------------------------------------------------------

create or replace function public.track_email_event(
  p_campaign_id uuid,
  p_contact_id uuid,
  p_event text,
  p_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_email text;
begin
  select organization_id into v_org from public.email_campaigns where id = p_campaign_id;
  if v_org is null then
    raise exception 'campaign not found';
  end if;

  select email into v_email from public.email_contacts where id = p_contact_id;

  insert into public.email_activities (organization_id, campaign_id, contact_id, email, event, url)
  values (v_org, p_campaign_id, p_contact_id, v_email, p_event, p_url);

  case p_event
    when 'opened' then
      update public.email_campaigns set opened_count = opened_count + 1 where id = p_campaign_id;
    when 'clicked' then
      update public.email_campaigns set clicked_count = clicked_count + 1 where id = p_campaign_id;
    when 'unsubscribed' then
      update public.email_campaigns set unsubscribed_count = unsubscribed_count + 1 where id = p_campaign_id;
      update public.email_contacts set unsubscribed = true where id = p_contact_id;
    else null;
  end case;
end;
$$;

grant execute on function public.track_email_event(uuid, uuid, text, text) to anon, authenticated, service_role;
