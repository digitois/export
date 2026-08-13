-- ------------------------------------------------------------------
-- Export OS - 00040: Advanced Marketing Automation Features
--
-- Inspired by HubSpot, ActiveCampaign, and Drip.com
-- Features: Drip campaigns, conditional branching, behavioral triggers,
-- goal completion, A/B testing, split paths, smart segmentation, wait-until
-- ------------------------------------------------------------------

-- Enhanced node types for advanced automation
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'workflow_node_type' and n.nspname = 'public') then
    create type public.workflow_node_type as enum (
      'trigger', 'action', 'condition', 'delay', 'integration', 'end',
      'drip_sequence', 'split_path', 'goal', 'wait_until', 'segment'
    );
  else
    -- Add new node types to existing enum
    do $$ begin
      alter type public.workflow_node_type add value if not exists 'drip_sequence';
      alter type public.workflow_node_type add value if not exists 'split_path';
      alter type public.workflow_node_type add value if not exists 'goal';
      alter type public.workflow_node_type add value if not exists 'wait_until';
      alter type public.workflow_node_type add value if not exists 'segment';
    exception
      when duplicate_object then null;
    end $$;
  end if;
end $$;

-- Enhanced action types
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'workflow_action_type' and n.nspname = 'public') then
    create type public.workflow_action_type as enum (
      'send_email', 'add_to_list', 'update_lead', 'create_task', 
      'notify_team', 'send_sms', 'send_whatsapp', 'webhook_call',
      'add_tag', 'remove_tag', 'update_contact_score', 'remove_from_list'
    );
  else
    -- Add new action types to existing enum
    do $$ begin
      alter type public.workflow_action_type add value if not exists 'add_tag';
      alter type public.workflow_action_type add value if not exists 'remove_tag';
      alter type public.workflow_action_type add value if not exists 'update_contact_score';
      alter type public.workflow_action_type add value if not exists 'remove_from_list';
    exception
      when duplicate_object then null;
    end $$;
  end if;
end $$;

-- Enhanced trigger types with behavioral events
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'workflow_trigger' and n.nspname = 'public') then
    create type public.workflow_trigger as enum (
      'lead_created', 'lead_status_changed', 'lead_converted', 'lead_lost',
      'inquiry_received', 'document_sent', 'invoice_due', 'payment_received',
      'website_event', 'time_based', 'webhook', 'manual',
      'email_opened', 'email_clicked', 'link_clicked', 'form_submitted',
      'page_visited', 'product_viewed', 'cart_abandoned', 'purchase_completed'
    );
  else
    -- Add new trigger types to existing enum
    do $$ begin
      alter type public.workflow_trigger add value if not exists 'email_opened';
      alter type public.workflow_trigger add value if not exists 'email_clicked';
      alter type public.workflow_trigger add value if not exists 'link_clicked';
      alter type public.workflow_trigger add value if not exists 'form_submitted';
      alter type public.workflow_trigger add value if not exists 'page_visited';
      alter type public.workflow_trigger add value if not exists 'product_viewed';
      alter type public.workflow_trigger add value if not exists 'cart_abandoned';
      alter type public.workflow_trigger add value if not exists 'purchase_completed';
    exception
      when duplicate_object then null;
    end $$;
  end if;
end $$;

-- Condition operators for advanced branching
do $$ begin
  create type public.condition_operator as enum (
    'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
    'greater_than', 'less_than', 'greater_equal', 'less_equal',
    'is_empty', 'is_not_empty', 'in_list', 'not_in_list',
    'matches_regex', 'date_before', 'date_after', 'date_between'
  );
exception
  when duplicate_object then null;
end $$;

-- Drip campaign sequences table
create table if not exists public.drip_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workflow_id uuid references public.email_workflows_enhanced (id) on delete cascade,
  name text not null,
  description text,
  send_schedule jsonb not null default '[]'::jsonb, -- Array of {delay_days, delay_hours, template_id}
  is_active boolean not null default true,
  total_sent int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drip campaign recipients tracking
create table if not exists public.drip_recipients (
  id uuid primary key default gen_random_uuid(),
  drip_campaign_id uuid not null references public.drip_campaigns (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  current_step int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active', -- 'active', 'completed', 'paused', 'removed'
  metadata jsonb default '{}'::jsonb,
  unique(drip_campaign_id, contact_id)
);

-- A/B testing campaigns
create table if not exists public.ab_test_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  test_type text not null, -- 'subject_line', 'content', 'send_time', 'from_name'
  variants jsonb not null, -- Array of {id, name, config, traffic_percentage}
  winning_variant_id uuid,
  test_status text not null default 'running', -- 'running', 'completed', 'paused'
  statistical_significance numeric(5,2),
  total_recipients int not null default 0,
  test_duration_days int,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A/B test results tracking
create table if not exists public.ab_test_results (
  id uuid primary key default gen_random_uuid(),
  ab_test_id uuid not null references public.ab_test_campaigns (id) on delete cascade,
  variant_id uuid not null,
  contact_id uuid references public.email_contacts (id) on delete set null,
  metric_type text not null, -- 'opened', 'clicked', 'converted', 'unsubscribed'
  metric_value numeric(18,4) not null default 0,
  recorded_at timestamptz not null default now()
);

-- Goal completion tracking
create table if not exists public.workflow_goals (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.email_workflows_enhanced (id) on delete cascade,
  name text not null,
  goal_type text not null, -- 'email_opened', 'link_clicked', 'form_submitted', 'purchase_made', 'custom_event'
  goal_config jsonb not null default '{}'::jsonb,
  is_required boolean default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Goal completion tracking per contact
create table if not exists public.workflow_goal_completions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.workflow_goals (id) on delete cascade,
  run_id uuid references public.email_workflow_runs_enhanced (id) on delete set null,
  contact_id uuid references public.email_contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  completed_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  unique(goal_id, contact_id)
);

-- Smart segmentation rules
create table if not exists public.segmentation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null default '[]'::jsonb, -- Array of {field, operator, value, logic}
  match_type text not null default 'all', -- 'all', 'any'
  estimated_count int not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Segment membership tracking
create table if not exists public.segment_memberships (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segmentation_rules (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  added_at timestamptz not null default now(),
  last_match_at timestamptz not null default now(),
  is_current boolean not null default true,
  unique(segment_id, contact_id)
);

-- Behavioral event tracking
create table if not exists public.behavioral_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid references public.email_contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  event_type text not null, -- 'page_view', 'link_click', 'form_submit', 'product_view', etc.
  event_data jsonb not null default '{}'::jsonb,
  session_id text,
  ip_address text,
  user_agent text,
  referrer text,
  occurred_at timestamptz not null default now()
);

-- Wait-until conditions table
create table if not exists public.wait_until_conditions (
  id uuid primary key default gen_random_uuid(),
  node_id uuid references public.email_workflow_nodes (id) on delete cascade,
  condition_type text not null, -- 'date', 'day_of_week', 'time', 'event_occurs', 'custom_condition'
  condition_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Split path testing configuration
create table if not exists public.split_paths (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.email_workflows_enhanced (id) on delete cascade,
  split_node_id uuid references public.email_workflow_nodes (id) on delete cascade,
  name text not null,
  split_type text not null default 'percentage', -- 'percentage', 'random', 'condition_based'
  paths jsonb not null, -- Array of {id, name, percentage, condition, target_node_id}
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Split path assignment tracking
create table if not exists public.split_path_assignments (
  id uuid primary key default gen_random_uuid(),
  split_path_id uuid not null references public.split_paths (id) on delete cascade,
  run_id uuid not null references public.email_workflow_runs_enhanced (id) on delete cascade,
  assigned_path_id uuid not null,
  assigned_at timestamptz not null default now()
);

-- Enhanced workflow nodes with new types
alter table public.email_workflow_nodes 
  add column if not exists split_config jsonb default '{}'::jsonb,
  add column if not exists goal_config jsonb default '{}'::jsonb,
  add column if not exists segment_config jsonb default '{}'::jsonb,
  add column if not exists wait_until_config jsonb default '{}'::jsonb;

-- Enhanced workflow edges with conditional logic
alter table public.email_workflow_edges 
  add column if not exists condition_type text default 'simple',
  add column if not exists condition_group jsonb default '[]'::jsonb, -- For complex AND/OR logic
  add column if not exists priority int default 0;

-- Indexes for performance
create index if not exists idx_drip_campaigns_org on public.drip_campaigns (organization_id, is_active);
create index if not exists idx_drip_recipients_campaign on public.drip_recipients (drip_campaign_id, status);
create index if not exists idx_drip_recipients_contact on public.drip_recipients (contact_id);
create index if not exists idx_ab_test_campaigns_org on public.ab_test_campaigns (organization_id, test_status);
create index if not exists idx_ab_test_results_test on public.ab_test_results (ab_test_id, variant_id);
create index if not exists idx_workflow_goals_workflow on public.workflow_goals (workflow_id);
create index if not exists idx_workflow_goal_completions_goal on public.workflow_goal_completions (goal_id);
create index if not exists idx_workflow_goal_completions_contact on public.workflow_goal_completions (contact_id);
create index if not exists idx_segmentation_rules_org on public.segmentation_rules (organization_id, is_active);
create index if not exists idx_segment_memberships_segment on public.segment_memberships (segment_id, is_current);
create index if not exists idx_segment_memberships_contact on public.segment_memberships (contact_id);
create index if not exists idx_behavioral_events_org on public.behavioral_events (organization_id, event_type);
create index if not exists idx_behavioral_events_contact on public.behavioral_events (contact_id, event_type);
create index if not exists idx_behavioral_events_occurred on public.behavioral_events (occurred_at);
create index if not exists idx_split_paths_workflow on public.split_paths (workflow_id, is_active);
create index if not exists idx_split_path_assignments_split on public.split_path_assignments (split_path_id);
create index if not exists idx_split_path_assignments_run on public.split_path_assignments (run_id);

-- Triggers for updated_at
drop trigger if exists trg_drip_campaigns_updated_at on public.drip_campaigns;
create trigger trg_drip_campaigns_updated_at before update on public.drip_campaigns
  for each row execute function set_updated_at();

drop trigger if exists trg_ab_test_campaigns_updated_at on public.ab_test_campaigns;
create trigger trg_ab_test_campaigns_updated_at before update on public.ab_test_campaigns
  for each row execute function set_updated_at();

drop trigger if exists trg_segmentation_rules_updated_at on public.segmentation_rules;
create trigger trg_segmentation_rules_updated_at before update on public.segmentation_rules
  for each row execute function set_updated_at();

-- Row Level Security
alter table public.drip_campaigns enable row level security;
alter table public.drip_recipients enable row level security;
alter table public.ab_test_campaigns enable row level security;
alter table public.ab_test_results enable row level security;
alter table public.workflow_goals enable row level security;
alter table public.workflow_goal_completions enable row level security;
alter table public.segmentation_rules enable row level security;
alter table public.segment_memberships enable row level security;
alter table public.behavioral_events enable row level security;
alter table public.wait_until_conditions enable row level security;
alter table public.split_paths enable row level security;
alter table public.split_path_assignments enable row level security;

-- RLS Policies (following existing patterns)
drop policy if exists drip_campaigns_select_org on public.drip_campaigns;
create policy drip_campaigns_select_org on public.drip_campaigns
  for select using (public.is_org_member(organization_id));

drop policy if exists drip_campaigns_insert_org on public.drip_campaigns;
create policy drip_campaigns_insert_org on public.drip_campaigns
  for insert with check (public.is_org_member(organization_id));

drop policy if exists drip_campaigns_update_org on public.drip_campaigns;
create policy drip_campaigns_update_org on public.drip_campaigns
  for update using (public.is_org_member(organization_id));

drop policy if exists drip_campaigns_delete_org on public.drip_campaigns;
create policy drip_campaigns_delete_org on public.drip_campaigns
  for delete using (public.has_role(organization_id, 'manager'));

-- Similar policies for other tables (simplified for brevity)
drop policy if exists drip_recipients_select_org on public.drip_recipients;
create policy drip_recipients_select_org on public.drip_recipients
  for select using (exists (
    select 1 from public.drip_campaigns dc 
    where dc.id = drip_recipients.drip_campaign_id 
    and is_org_member(dc.organization_id)
  ));

drop policy if exists drip_recipients_insert_org on public.drip_recipients;
create policy drip_recipients_insert_org on public.drip_recipients
  for insert with check (exists (
    select 1 from public.drip_campaigns dc 
    where dc.id = drip_recipients.drip_campaign_id 
    and is_org_member(dc.organization_id)
  ));

-- Apply similar pattern to other tables
drop policy if exists ab_test_campaigns_select_org on public.ab_test_campaigns;
create policy ab_test_campaigns_select_org on public.ab_test_campaigns
  for select using (public.is_org_member(organization_id));

drop policy if exists ab_test_campaigns_insert_org on public.ab_test_campaigns;
create policy ab_test_campaigns_insert_org on public.ab_test_campaigns
  for insert with check (public.is_org_member(organization_id));

drop policy if exists ab_test_campaigns_update_org on public.ab_test_campaigns;
create policy ab_test_campaigns_update_org on public.ab_test_campaigns
  for update using (public.is_org_member(organization_id));

drop policy if exists ab_test_campaigns_delete_org on public.ab_test_campaigns;
create policy ab_test_campaigns_delete_org on public.ab_test_campaigns
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists segmentation_rules_select_org on public.segmentation_rules;
create policy segmentation_rules_select_org on public.segmentation_rules
  for select using (public.is_org_member(organization_id));

drop policy if exists segmentation_rules_insert_org on public.segmentation_rules;
create policy segmentation_rules_insert_org on public.segmentation_rules
  for insert with check (public.is_org_member(organization_id));

drop policy if exists segmentation_rules_update_org on public.segmentation_rules;
create policy segmentation_rules_update_org on public.segmentation_rules
  for update using (public.is_org_member(organization_id));

drop policy if exists segmentation_rules_delete_org on public.segmentation_rules;
create policy segmentation_rules_delete_org on public.segmentation_rules
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists behavioral_events_select_org on public.behavioral_events;
create policy behavioral_events_select_org on public.behavioral_events
  for select using (public.is_org_member(organization_id));

drop policy if exists behavioral_events_insert_org on public.behavioral_events;
create policy behavioral_events_insert_org on public.behavioral_events
  for insert with check (public.is_org_member(organization_id));

-- Grants
grant select, insert, update, delete on public.drip_campaigns to authenticated, service_role;
grant select, insert, update, delete on public.drip_recipients to authenticated, service_role;
grant select, insert, update, delete on public.ab_test_campaigns to authenticated, service_role;
grant select, insert, update, delete on public.ab_test_results to authenticated, service_role;
grant select, insert, update, delete on public.workflow_goals to authenticated, service_role;
grant select, insert, update, delete on public.workflow_goal_completions to authenticated, service_role;
grant select, insert, update, delete on public.segmentation_rules to authenticated, service_role;
grant select, insert, update, delete on public.segment_memberships to authenticated, service_role;
grant select, insert on public.behavioral_events to authenticated, service_role;
grant select, insert, update, delete on public.wait_until_conditions to authenticated, service_role;
grant select, insert, update, delete on public.split_paths to authenticated, service_role;
grant select, insert, update, delete on public.split_path_assignments to authenticated, service_role;

-- Helper function to evaluate complex conditions
create or replace function public.evaluate_complex_condition(
  p_data jsonb,
  p_rules jsonb,
  p_match_type text default 'all'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean := p_match_type = 'all';
  v_rule json;
  v_field text;
  v_operator public.condition_operator;
  v_value jsonb;
  v_field_value jsonb;
  v_rule_result boolean;
begin
  for v_rule in select * from jsonb_array_elements(p_rules)
  loop
    v_field := v_rule->>'field';
    v_operator := v_rule->>'operator';
    v_value := v_rule->'value';
    v_field_value := p_data->v_field;

    v_rule_result := public.evaluate_simple_condition(v_field_value, v_operator, v_value);

    if p_match_type = 'all' then
      v_result := v_result and v_rule_result;
      if not v_result then
        return false;
      end if;
    else -- any
      v_result := v_result or v_rule_result;
      if v_result then
        return true;
      end if;
    end if;
  end loop;

  return v_result;
end;
$$;

grant execute on function public.evaluate_complex_condition to authenticated, service_role;

-- Helper function to evaluate simple conditions
create or replace function public.evaluate_simple_condition(
  p_field_value jsonb,
  p_operator public.condition_operator,
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
    when 'date_before' then return p_field_value::timestamptz < p_value::timestamptz;
    when 'date_after' then return p_field_value::timestamptz > p_value::timestamptz;
    when 'date_between' then 
      return p_field_value::timestamptz between (p_value->0)::timestamptz and (p_value->1)::timestamptz;
    else return false;
  end case;
exception
  when others then return false;
end;
$$;

grant execute on function public.evaluate_simple_condition to authenticated, service_role;

-- Function to add contact to segment based on rules
create or replace function public.add_contact_to_segment(
  p_segment_id uuid,
  p_contact_id uuid,
  p_lead_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_segment public.segmentation_rules;
  v_contact_data jsonb;
  v_matches boolean;
begin
  -- Get segment rules
  select * into v_segment from public.segmentation_rules where id = p_segment_id;
  
  -- Get contact data (simplified - in real implementation would join with contacts/leads tables)
  v_contact_data := jsonb_build_object('contact_id', p_contact_id, 'lead_id', p_lead_id);
  
  -- Evaluate rules
  v_matches := public.evaluate_complex_condition(v_contact_data, v_segment.rules, v_segment.match_type);
  
  if v_matches then
    insert into public.segment_memberships (segment_id, contact_id, lead_id, is_current)
    values (p_segment_id, p_contact_id, p_lead_id, true)
    on conflict (segment_id, contact_id) do update set
      is_current = true,
      last_match_at = now();
      
    -- Update estimated count
    update public.segmentation_rules
    set estimated_count = estimated_count + 1
    where id = p_segment_id;
  end if;
end;
$$;

grant execute on function public.add_contact_to_segment to authenticated, service_role;