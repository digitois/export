-- ------------------------------------------------------------------
-- Export OS - 00044: Triggers (Event + Schedule + Webhook)
--
-- Event-based triggers with conditions, cron schedules, and webhook endpoints
-- Integrates with sequences for enrollment
-- ------------------------------------------------------------------

-- Trigger event types (extends existing workflow_trigger)
do $$ begin
  -- Add more event types if not exists
  do $$ begin
    alter type public.workflow_trigger add value if not exists 'sequence_completed';
    alter type public.workflow_trigger add value if not exists 'sequence_step_sent';
    alter type public.workflow_trigger add value if not exists 'contact_added_to_list';
    alter type public.workflow_trigger add value if not exists 'contact_removed_from_list';
    alter type public.workflow_trigger add value if not exists 'tag_added';
    alter type public.workflow_trigger add value if not exists 'tag_removed';
  exception when duplicate_object then null; end $$;
end $$;

-- Condition operator type
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'trigger_condition_operator' and n.nspname = 'public') then
    create type public.trigger_condition_operator as enum (
      'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
      'greater_than', 'less_than', 'greater_equal', 'less_equal',
      'is_empty', 'is_not_empty', 'in_list', 'not_in_list'
    );
  end if;
end $$;

-- Webhook endpoints (for inbound/outbound)
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  url text not null,
  secret text, -- HMAC secret for signing
  events text[] not null default '{}', -- Event types to listen for
  is_active boolean not null default true,
  retry_count int not null default 3,
  timeout_ms int not null default 10000,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Webhook deliveries (outbound)
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
  attempt int not null default 0,
  response_status int,
  response_body text,
  error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Triggers table
create table if not exists public.triggers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  event_type public.workflow_trigger not null,
  conditions jsonb not null default '[]'::jsonb, -- Array of {field, operator, value}
  condition_logic text not null default 'and', -- 'and' or 'or'
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  is_active boolean not null default true,
  schedule_cron text, -- For time_based triggers
  schedule_timezone text default 'UTC',
  webhook_endpoint_id uuid references public.webhook_endpoints (id) on delete set null,
  fired_count int not null default 0,
  enrolled_count int not null default 0,
  skipped_count int not null default 0,
  last_fired_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger evaluations (audit log)
create table if not exists public.trigger_evaluations (
  id uuid primary key default gen_random_uuid(),
  trigger_id uuid not null references public.triggers (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  event_type text not null,
  matched boolean not null,
  enrolled boolean not null,
  skip_reason text,
  error text,
  event_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_triggers_org on public.triggers (organization_id, is_active);
create index if not exists idx_triggers_event on public.triggers (event_type, is_active);
create index if not exists idx_triggers_sequence on public.triggers (sequence_id);
create index if not exists idx_trigger_evaluations_trigger on public.trigger_evaluations (trigger_id, created_at);
create index if not exists idx_trigger_evaluations_contact on public.trigger_evaluations (contact_id);
create index if not exists idx_webhook_endpoints_org on public.webhook_endpoints (organization_id, is_active);
create index if not exists idx_webhook_deliveries_endpoint on public.webhook_deliveries (webhook_endpoint_id, status);
create index if not exists idx_webhook_deliveries_retry on public.webhook_deliveries (next_retry_at) where status = 'retrying';

-- Trigger for updated_at
drop trigger if exists trg_triggers_updated_at on public.triggers;
create trigger trg_triggers_updated_at before update on public.triggers
  for each row execute function set_updated_at();

drop trigger if exists trg_webhook_endpoints_updated_at on public.webhook_endpoints;
create trigger trg_webhook_endpoints_updated_at before update on public.webhook_endpoints
  for each row execute function set_updated_at();

-- RLS
alter table public.triggers enable row level security;
alter table public.trigger_evaluations enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

-- Triggers policies
drop policy if exists triggers_select_org on public.triggers;
create policy triggers_select_org on public.triggers
  for select using (public.is_org_member(organization_id));

drop policy if exists triggers_insert_org on public.triggers;
create policy triggers_insert_org on public.triggers
  for insert with check (public.is_org_member(organization_id));

drop policy if exists triggers_update_org on public.triggers;
create policy triggers_update_org on public.triggers
  for update using (public.is_org_member(organization_id));

drop policy if exists triggers_delete_org on public.triggers;
create policy triggers_delete_org on public.triggers
  for delete using (public.has_role(organization_id, 'manager'));

-- Trigger evaluations policies
drop policy if exists trigger_evaluations_select_org on public.trigger_evaluations;
create policy trigger_evaluations_select_org on public.trigger_evaluations
  for select using (
    exists (
      select 1 from public.triggers t
      where t.id = trigger_evaluations.trigger_id
      and is_org_member(t.organization_id)
    )
  );

drop policy if exists trigger_evaluations_insert_org on public.trigger_evaluations;
create policy trigger_evaluations_insert_org on public.trigger_evaluations
  for insert with check (
    exists (
      select 1 from public.triggers t
      where t.id = trigger_evaluations.trigger_id
      and is_org_member(t.organization_id)
    )
  );

-- Webhook endpoints policies
drop policy if exists webhook_endpoints_select_org on public.webhook_endpoints;
create policy webhook_endpoints_select_org on public.webhook_endpoints
  for select using (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_insert_org on public.webhook_endpoints;
create policy webhook_endpoints_insert_org on public.webhook_endpoints
  for insert with check (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_update_org on public.webhook_endpoints;
create policy webhook_endpoints_update_org on public.webhook_endpoints
  for update using (public.is_org_member(organization_id));

drop policy if exists webhook_endpoints_delete_org on public.webhook_endpoints;
create policy webhook_endpoints_delete_org on public.webhook_endpoints
  for delete using (public.has_role(organization_id, 'manager'));

-- Webhook deliveries policies
drop policy if exists webhook_deliveries_select_org on public.webhook_deliveries;
create policy webhook_deliveries_select_org on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhook_endpoints we
      where we.id = webhook_deliveries.webhook_endpoint_id
      and is_org_member(we.organization_id)
    )
  );

-- Grants
grant select, insert, update, delete on public.triggers to authenticated, service_role;
grant select, insert, update, delete on public.trigger_evaluations to authenticated, service_role;
grant select, insert, update, delete on public.webhook_endpoints to authenticated, service_role;
grant select, insert, update, delete on public.webhook_deliveries to authenticated, service_role;

-- Function to evaluate trigger conditions
create or replace function public.evaluate_trigger_conditions(
  p_conditions jsonb,
  p_data jsonb,
  p_logic text default 'and'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean := p_logic = 'and';
  v_condition jsonb;
  v_field text;
  v_operator public.trigger_condition_operator;
  v_value jsonb;
  v_field_value jsonb;
  v_condition_result boolean;
begin
  if p_conditions is null or jsonb_typeof(p_conditions) != 'array' or jsonb_array_length(p_conditions) = 0 then
    return true; -- No conditions = always match
  end if;

  for v_condition in select * from jsonb_array_elements(p_conditions)
  loop
    v_field := v_condition->>'field';
    v_operator := v_condition->>'operator';
    v_value := v_condition->'value';
    v_field_value := p_data->v_field;

    v_condition_result := public.evaluate_simple_trigger_condition(v_field_value, v_operator, v_value);

    if p_logic = 'and' then
      v_result := v_result and v_condition_result;
      if not v_result then return false; end if;
    else -- or
      v_result := v_result or v_condition_result;
      if v_result then return true; end if;
    end if;
  end loop;

  return v_result;
end;
$$;

grant execute on function public.evaluate_trigger_conditions(jsonb, jsonb, text) to authenticated, service_role;

-- Simple condition evaluation for triggers
create or replace function public.evaluate_simple_trigger_condition(
  p_field_value jsonb,
  p_operator public.trigger_condition_operator,
  p_value jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  case p_operator
    when 'equals' then return p_field_value = p_value;
    when 'not_equals' then return p_field_value != p_value;
    when 'contains' then return p_field_value::text ilike '%' || p_value::text || '%';
    when 'not_contains' then return not (p_field_value::text ilike '%' || p_value::text || '%');
    when 'starts_with' then return p_field_value::text ilike p_value::text || '%';
    when 'ends_with' then return p_field_value::text ilike '%' || p_value::text;
    when 'greater_than' then return (p_field_value::numeric) > (p_value::numeric);
    when 'less_than' then return (p_field_value::numeric) < (p_value::numeric);
    when 'greater_equal' then return (p_field_value::numeric) >= (p_value::numeric);
    when 'less_equal' then return (p_field_value::numeric) <= (p_value::numeric);
    when 'is_empty' then return p_field_value is null or p_field_value::text = '';
    when 'is_not_empty' then return p_field_value is not null and p_field_value::text != '';
    when 'in_list' then return p_field_value = any(p_value::jsonb[]);
    when 'not_in_list' then return p_field_value != all(p_value::jsonb[]);
    else return false;
  end case;
exception
  when others then return false;
end;
$$;

grant execute on function public.evaluate_simple_trigger_condition(jsonb, public.trigger_condition_operator, jsonb) to authenticated, service_role;

-- Function to fire trigger (called by event system)
create or replace function public.fire_trigger(
  p_organization_id uuid,
  p_event_type public.workflow_trigger,
  p_contact_id uuid default null,
  p_lead_id uuid default null,
  p_event_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trigger record;
  v_matched boolean;
  v_contact_data jsonb;
  v_enrollment_id uuid;
begin
  for v_trigger in
    select * from public.triggers
    where organization_id = p_organization_id
      and is_active = true
      and event_type = p_event_type
  loop
    -- Build contact data for condition evaluation
    v_contact_data := jsonb_build_object(
      'contact_id', p_contact_id,
      'lead_id', p_lead_id,
      'event_type', p_event_type,
      'event_data', p_event_data
    );

    -- Evaluate conditions
    if public.evaluate_trigger_conditions(v_trigger.conditions, v_contact_data, v_trigger.condition_logic) then
      -- Conditions matched, enroll in sequence
      insert into public.sequence_enrollments (sequence_id, contact_id, lead_id, status)
      values (v_trigger.sequence_id, p_contact_id, p_lead_id, 'active')
      on conflict (sequence_id, contact_id) do update set
        status = 'active',
        metadata = jsonb_set(coalesce(sequence_enrollments.metadata, '{}'::jsonb), '{triggered_by}', to_jsonb(v_trigger.id::text))
      returning id into v_enrollment_id;

      -- Log evaluation
      insert into public.trigger_evaluations (trigger_id, contact_id, lead_id, event_type, matched, enrolled)
      values (v_trigger.id, p_contact_id, p_lead_id, p_event_type::text, true, true);

      -- Update trigger counters
      update public.triggers
      set fired_count = fired_count + 1,
          enrolled_count = enrolled_count + 1,
          last_fired_at = now()
      where id = v_trigger.id;
    else
      -- Log skipped evaluation
      insert into public.trigger_evaluations (trigger_id, contact_id, lead_id, event_type, matched, enrolled, skip_reason)
      values (v_trigger.id, p_contact_id, p_lead_id, p_event_type::text, false, false, 'Conditions not met');
      
      update public.triggers
      set skipped_count = skipped_count + 1
      where id = v_trigger.id;
    end if;
  end loop;
end;
$$;

grant execute on function public.fire_trigger(uuid, public.workflow_trigger, uuid, uuid, jsonb) to authenticated, service_role;