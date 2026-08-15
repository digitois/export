-- ------------------------------------------------------------------
-- Export OS - 00045: Email Activity Log (Full Delivery Tracking)
--
-- Complete email lifecycle tracking: sent → delivered → opened/clicked
-- → bounced/complained/unsubscribed
-- Works with sender accounts, sequences, campaigns, templates
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'email_event_type' and n.nspname = 'public') then
    create type public.email_event_type as enum (
      'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'email_bounce_type' and n.nspname = 'public') then
    create type public.email_bounce_type as enum ('hard', 'soft', 'transient');
  end if;
end $$;

-- Main email activity log (extends table created in 00014)
alter table public.email_activities
  add column if not exists sender_account_id uuid references public.sender_accounts (id) on delete set null,
  add column if not exists lead_id uuid references public.leads (id) on delete set null,
  add column if not exists message_id text,
  add column if not exists template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists sequence_id uuid references public.sequences (id) on delete set null,
  add column if not exists sequence_enrollment_id uuid references public.sequence_enrollments (id) on delete set null,
  add column if not exists bounce_type public.email_bounce_type,
  add column if not exists bounce_subtype text,
  add column if not exists bounce_diagnostic text,
  add column if not exists click_url text,
  add column if not exists click_count int default 1,
  add column if not exists open_count int default 1,
  add column if not exists user_agent text,
  add column if not exists ip_address text,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Convert event column to typed enum (values from 00014 all exist in enum)
do $$
begin
  alter table public.email_activities
    alter column event type public.email_event_type
      using event::public.email_event_type;
exception when others then null;
end;
$$;

-- Email tracking pixels (for open tracking)
create table if not exists public.email_tracking_pixels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  token text not null unique,
  opened_at timestamptz,
  open_count int not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- Link tracking (for click tracking)
create table if not exists public.email_tracking_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_activity_id uuid not null references public.email_activities (id) on delete cascade,
  original_url text not null,
  token text not null unique,
  click_count int not null default 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Unsubscribe tracking
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete set null,
  email text not null,
  list_id uuid references public.contact_lists (id) on delete set null,
  campaign_id uuid,
  sequence_id uuid references public.sequences (id) on delete set null,
  source text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique(organization_id, email, list_id)
);

-- Suppression list (bounced/complained/unsubscribed - never send again)
create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('bounce', 'complaint', 'unsubscribe', 'manual')),
  source_email_activity_id uuid references public.email_activities (id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(organization_id, email, reason)
);

-- Indexes
create index if not exists idx_email_activities_org on public.email_activities (organization_id, occurred_at desc);
create index if not exists idx_email_activities_contact on public.email_activities (contact_id, occurred_at desc);
create index if not exists idx_email_activities_event on public.email_activities (event, occurred_at desc);
create index if not exists idx_email_activities_message on public.email_activities (message_id);
create index if not exists idx_email_activities_template on public.email_activities (template_id);
create index if not exists idx_email_activities_sequence on public.email_activities (sequence_id);
create index if not exists idx_email_activities_email on public.email_activities (email);
create index if not exists idx_email_tracking_pixels_token on public.email_tracking_pixels (token);
create index if not exists idx_email_tracking_links_token on public.email_tracking_links (token);
create index if not exists idx_email_unsubscribes_org_email on public.email_unsubscribes (organization_id, email);
create index if not exists idx_email_suppressions_org_email on public.email_suppressions (organization_id, email);

-- RLS
alter table public.email_activities enable row level security;
alter table public.email_tracking_pixels enable row level security;
alter table public.email_tracking_links enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.email_suppressions enable row level security;

-- Email activities policies
drop policy if exists email_activities_select_org on public.email_activities;
create policy email_activities_select_org on public.email_activities
  for select using (public.is_org_member(organization_id));

drop policy if exists email_activities_insert_org on public.email_activities;
create policy email_activities_insert_org on public.email_activities
  for insert with check (public.is_org_member(organization_id));

-- Tracking pixels policies
drop policy if exists email_tracking_pixels_select_org on public.email_tracking_pixels;
create policy email_tracking_pixels_select_org on public.email_tracking_pixels
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_pixels_insert_org on public.email_tracking_pixels;
create policy email_tracking_pixels_insert_org on public.email_tracking_pixels
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_pixels_update_org on public.email_tracking_pixels;
create policy email_tracking_pixels_update_org on public.email_tracking_pixels
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_pixels.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Tracking links policies
drop policy if exists email_tracking_links_select_org on public.email_tracking_links;
create policy email_tracking_links_select_org on public.email_tracking_links
  for select using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_links_insert_org on public.email_tracking_links;
create policy email_tracking_links_insert_org on public.email_tracking_links
  for insert with check (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

drop policy if exists email_tracking_links_update_org on public.email_tracking_links;
create policy email_tracking_links_update_org on public.email_tracking_links
  for update using (
    exists (
      select 1 from public.email_activities ea
      where ea.id = email_tracking_links.email_activity_id
      and is_org_member(ea.organization_id)
    )
  );

-- Unsubscribes policies
drop policy if exists email_unsubscribes_select_org on public.email_unsubscribes;
create policy email_unsubscribes_select_org on public.email_unsubscribes
  for select using (public.is_org_member(organization_id));

drop policy if exists email_unsubscribes_insert_org on public.email_unsubscribes;
create policy email_unsubscribes_insert_org on public.email_unsubscribes
  for insert with check (public.is_org_member(organization_id));

-- Suppressions policies
drop policy if exists email_suppressions_select_org on public.email_suppressions;
create policy email_suppressions_select_org on public.email_suppressions
  for select using (public.is_org_member(organization_id));

drop policy if exists email_suppressions_insert_org on public.email_suppressions;
create policy email_suppressions_insert_org on public.email_suppressions
  for insert with check (public.is_org_member(organization_id));

drop policy if exists email_suppressions_update_org on public.email_suppressions;
create policy email_suppressions_update_org on public.email_suppressions
  for update using (public.is_org_member(organization_id));

-- Grants
grant select, insert, update, delete on public.email_activities to authenticated, service_role;
grant select, insert, update, delete on public.email_tracking_pixels to authenticated, service_role;
grant select, insert, update, delete on public.email_tracking_links to authenticated, service_role;
grant select, insert, update, delete on public.email_unsubscribes to authenticated, service_role;
grant select, insert, update, delete on public.email_suppressions to authenticated, service_role;

-- Function to log email activity
create or replace function public.log_email_activity(
  p_organization_id uuid,
  p_sender_account_id uuid,
  p_contact_id uuid,
  p_lead_id uuid,
  p_email text,
  p_event public.email_event_type,
  p_message_id text,
  p_template_id uuid,
  p_campaign_id uuid,
  p_sequence_id uuid,
  p_sequence_enrollment_id uuid,
  p_bounce_type public.email_bounce_type,
  p_bounce_subtype text,
  p_bounce_diagnostic text,
  p_click_url text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
begin
  insert into public.email_activities (
    organization_id, sender_account_id, contact_id, lead_id, email, event,
    message_id, template_id, campaign_id, sequence_id, sequence_enrollment_id,
    bounce_type, bounce_subtype, bounce_diagnostic, click_url, metadata
  ) values (
    p_organization_id, p_sender_account_id, p_contact_id, p_lead_id, p_email, p_event,
    p_message_id, p_template_id, p_campaign_id, p_sequence_id, p_sequence_enrollment_id,
    p_bounce_type, null, null, p_click_url, p_metadata
  ) returning id into v_activity_id;

  if p_sender_account_id is not null then
    perform public.record_sender_account_usage(p_sender_account_id, p_event::text);
  end if;

  if p_event in ('bounced', 'complained', 'unsubscribed') then
    insert into public.email_suppressions (organization_id, email, reason, source_email_activity_id)
    values (p_organization_id, p_email, p_event::text, v_activity_id)
    on conflict (organization_id, email, reason) do nothing;
  end if;

  if p_event = 'bounced' then
    perform public.update_verification_stats(p_organization_id);
  end if;

  return v_activity_id;
end;
$$;

grant execute on function public.log_email_activity(
  uuid, uuid, uuid, uuid, text, public.email_event_type, text, uuid, uuid, uuid, uuid,
  public.email_bounce_type, text, text, text, jsonb
) to authenticated, service_role;

-- Function to record open (called by tracking pixel endpoint)
create or replace function public.record_email_open(
  p_token text,
  p_user_agent text,
  p_ip_address text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pixel record;
  v_activity_id uuid;
begin
  select * into v_pixel
  from public.email_tracking_pixels
  where token = p_token;

  if not found then return; end if;

  update public.email_tracking_pixels
  set open_count = open_count + 1,
      last_opened_at = now(),
      first_opened_at = coalesce(first_opened_at, now()),
      opened_at = now()
  where id = v_pixel.id;

  update public.email_activities
  set open_count = open_count + 1,
      metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{last_open}', to_jsonb(now()::text))
  where id = v_pixel.email_activity_id;
end;
$$;

grant execute on function public.record_email_open(text, text, text) to authenticated, service_role;

-- Function to record click (called by link redirect endpoint)
create or replace function public.record_email_click(
  p_token text,
  p_user_agent text,
  p_ip_address text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_original_url text;
begin
  select * into v_link
  from public.email_tracking_links
  where token = p_token;

  if not found then return null; end if;

  v_original_url := v_link.original_url;

  update public.email_tracking_links
  set click_count = click_count + 1,
      last_clicked_at = now(),
      first_clicked_at = coalesce(first_clicked_at, now())
  where id = v_link.id;

  update public.email_activities
  set click_count = click_count + 1,
      metadata = jsonb_set(
        jsonb_set(coalesce(metadata, '{}'::jsonb), '{last_click}', to_jsonb(now()::text)),
        '{last_click_url}', to_jsonb(v_original_url)
      )
  where id = v_link.email_activity_id;

  return v_original_url;
end;
$$;

grant execute on function public.record_email_click(text, text, text) to authenticated, service_role;

-- Function to handle unsubscribe
create or replace function public.handle_unsubscribe(
  p_organization_id uuid,
  p_email text,
  p_list_id uuid,
  p_campaign_id uuid,
  p_sequence_id uuid,
  p_source text,
  p_ip_address text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
begin
  select id into v_contact_id
  from public.email_contacts
  where organization_id = p_organization_id and email = p_email
  limit 1;

  insert into public.email_unsubscribes (
    organization_id, contact_id, email, list_id, campaign_id, sequence_id,
    source, ip_address, user_agent
  ) values (
    p_organization_id, v_contact_id, p_email, p_list_id, p_campaign_id, p_sequence_id,
    p_source, p_ip_address, p_user_agent
  ) on conflict (organization_id, email, list_id) do update set
    source = excluded.source,
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent,
    created_at = now();

  insert into public.email_suppressions (organization_id, email, reason, metadata)
  values (p_organization_id, p_email, 'unsubscribe', jsonb_build_object('source', p_source, 'list_id', p_list_id))
  on conflict (organization_id, email, reason) do nothing;

  update public.email_contacts
  set unsubscribed = true, unsubscribed_at = now()
  where organization_id = p_organization_id and email = p_email;
end;
$$;

grant execute on function public.handle_unsubscribe(uuid, text, uuid, uuid, uuid, text, text, text) to authenticated, service_role;