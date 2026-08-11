-- ------------------------------------------------------------------
-- Export OS - 00039: Enhanced Email Workflow Automation
--
-- Visual drag-and-drop email builder with node-based workflow automation
-- Supports complex multi-step sequences, conditional branching, and integrations
-- ------------------------------------------------------------------

-- Enhanced workflow trigger types
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'workflow_trigger' and n.nspname = 'public') then
    create type public.workflow_trigger as enum (
      'lead_created', 'lead_status_changed', 'lead_converted', 'lead_lost',
      'inquiry_received', 'document_sent', 'invoice_due', 'payment_received',
      'website_event', 'time_based', 'webhook', 'manual'
    );
  else
    -- Add new trigger types to existing enum
    do $$ begin
      alter type public.workflow_trigger add value if not exists 'lead_converted';
      alter type public.workflow_trigger add value if not exists 'lead_lost';
      alter type public.workflow_trigger add value if not exists 'document_sent';
      alter type public.workflow_trigger add value if not exists 'invoice_due';
      alter type public.workflow_trigger add value if not exists 'payment_received';
      alter type public.workflow_trigger add value if not exists 'website_event';
      alter type public.workflow_trigger add value if not exists 'time_based';
      alter type public.workflow_trigger add value if not exists 'webhook';
      alter type public.workflow_trigger add value if not exists 'manual';
    exception
      when duplicate_object then null;
    end $$;
  end if;
end $$;

-- Node types for visual workflow builder
do $$ begin
  create type public.workflow_node_type as enum (
    'trigger', 'action', 'condition', 'delay', 'integration', 'end'
  );
exception
  when duplicate_object then null;
end $$;

-- Action types for action nodes
do $$ begin
  create type public.workflow_action_type as enum (
    'send_email', 'add_to_list', 'update_lead', 'create_task', 
    'notify_team', 'send_sms', 'send_whatsapp', 'webhook_call'
  );
exception
  when duplicate_object then null;
end $$;

-- Enhanced email workflows table with visual builder support
create table if not exists public.email_workflows_enhanced (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  trigger_type public.workflow_trigger not null,
  trigger_config jsonb not null default '{}'::jsonb, -- Trigger-specific configuration
  is_active boolean not null default true,
  run_count int not null default 0,
  last_run_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workflow nodes for visual builder
create table if not exists public.email_workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.email_workflows_enhanced (id) on delete cascade,
  node_type public.workflow_node_type not null,
  action_type public.workflow_action_type, -- For action nodes
  position_x int not null default 0,
  position_y int not null default 0,
  config jsonb not null default '{}'::jsonb, -- Node-specific configuration
  parent_id uuid references public.email_workflow_nodes (id), -- For conditional branching
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workflow edges for connecting nodes
create table if not exists public.email_workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.email_workflows_enhanced (id) on delete cascade,
  from_node_id uuid not null references public.email_workflow_nodes (id) on delete cascade,
  to_node_id uuid not null references public.email_workflow_nodes (id) on delete cascade,
  condition jsonb default '{}'::jsonb, -- Conditional logic for the edge
  label text, -- Optional label for the edge
  created_at timestamptz not null default now()
);

-- Enhanced email templates with drag-and-drop builder support
create table if not exists public.email_templates_enhanced (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  subject text not null,
  body jsonb not null, -- JSON structure for drag-and-drop blocks
  html_content text, -- Generated HTML from blocks
  is_public boolean default false,
  category text, -- 'welcome', 'follow_up', 'promotion', etc.
  thumbnail_url text,
  usage_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email template blocks for drag-and-drop builder
create table if not exists public.email_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.email_templates_enhanced (id) on delete cascade,
  block_type text not null, -- 'text', 'image', 'button', 'divider', 'social', 'custom'
  position int not null default 0,
  config jsonb not null default '{}'::jsonb, -- Block-specific configuration
  content jsonb, -- Block content data
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workflow execution runs
create table if not exists public.email_workflow_runs_enhanced (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workflow_id uuid references public.email_workflows_enhanced (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  contact_id uuid references public.email_contacts (id) on delete set null,
  current_node_id uuid references public.email_workflow_nodes (id) on delete set null,
  status text not null default 'running', -- 'running', 'completed', 'failed', 'paused'
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Workflow step execution logs
create table if not exists public.email_workflow_step_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.email_workflow_runs_enhanced (id) on delete cascade,
  node_id uuid references public.email_workflow_nodes (id) on delete set null,
  action_type public.workflow_action_type,
  status text not null, -- 'pending', 'running', 'completed', 'failed', 'skipped'
  input_data jsonb,
  output_data jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes for performance
create index if not exists idx_email_workflows_enhanced_org on public.email_workflows_enhanced (organization_id, is_active);
create index if not exists idx_email_workflow_nodes_workflow on public.email_workflow_nodes (workflow_id);
create index if not exists idx_email_workflow_edges_workflow on public.email_workflow_edges (workflow_id);
create index if not exists idx_email_workflow_edges_from on public.email_workflow_edges (from_node_id);
create index if not exists idx_email_workflow_edges_to on public.email_workflow_edges (to_node_id);
create index if not exists idx_email_templates_enhanced_org on public.email_templates_enhanced (organization_id);
create index if not exists idx_email_template_blocks_template on public.email_template_blocks (template_id);
create index if not exists idx_email_workflow_runs_enhanced_org on public.email_workflow_runs_enhanced (organization_id);
create index if not exists idx_email_workflow_runs_enhanced_workflow on public.email_workflow_runs_enhanced (workflow_id);
create index if not exists idx_email_workflow_runs_enhanced_status on public.email_workflow_runs_enhanced (status);
create index if not exists idx_email_workflow_step_logs_run on public.email_workflow_step_logs (run_id);

-- Triggers for updated_at
drop trigger if exists trg_email_workflows_enhanced_updated_at on public.email_workflows_enhanced;
create trigger trg_email_workflows_enhanced_updated_at before update on public.email_workflows_enhanced
  for each row execute function set_updated_at();

drop trigger if exists trg_email_workflow_nodes_updated_at on public.email_workflow_nodes;
create trigger trg_email_workflow_nodes_updated_at before update on public.email_workflow_nodes
  for each row execute function set_updated_at();

drop trigger if exists trg_email_templates_enhanced_updated_at on public.email_templates_enhanced;
create trigger trg_email_templates_enhanced_updated_at before update on public.email_templates_enhanced
  for each row execute function set_updated_at();

drop trigger if exists trg_email_template_blocks_updated_at on public.email_template_blocks;
create trigger trg_email_template_blocks_updated_at before update on public.email_template_blocks
  for each row execute function set_updated_at();

-- Row Level Security
alter table public.email_workflows_enhanced enable row level security;
alter table public.email_workflow_nodes enable row level security;
alter table public.email_workflow_edges enable row level security;
alter table public.email_templates_enhanced enable row level security;
alter table public.email_template_blocks enable row level security;
alter table public.email_workflow_runs_enhanced enable row level security;
alter table public.email_workflow_step_logs enable row level security;

-- RLS Policies for email_workflows_enhanced
drop policy if exists email_workflows_enhanced_select_org on public.email_workflows_enhanced;
create policy email_workflows_enhanced_select_org on public.email_workflows_enhanced
  for select using (public.is_org_member(organization_id));

drop policy if exists email_workflows_enhanced_insert_org on public.email_workflows_enhanced;
create policy email_workflows_enhanced_insert_org on public.email_workflows_enhanced
  for insert with check (public.is_org_member(organization_id));

drop policy if exists email_workflows_enhanced_update_org on public.email_workflows_enhanced;
create policy email_workflows_enhanced_update_org on public.email_workflows_enhanced
  for update using (public.is_org_member(organization_id));

drop policy if exists email_workflows_enhanced_delete_org on public.email_workflows_enhanced;
create policy email_workflows_enhanced_delete_org on public.email_workflows_enhanced
  for delete using (public.has_role(organization_id, 'manager'));

-- RLS Policies for email_workflow_nodes (inherited from workflow)
drop policy if exists email_workflow_nodes_select_org on public.email_workflow_nodes;
create policy email_workflow_nodes_select_org on public.email_workflow_nodes
  for select using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_nodes.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_nodes_insert_org on public.email_workflow_nodes;
create policy email_workflow_nodes_insert_org on public.email_workflow_nodes
  for insert with check (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_nodes.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_nodes_update_org on public.email_workflow_nodes;
create policy email_workflow_nodes_update_org on public.email_workflow_nodes
  for update using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_nodes.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_nodes_delete_org on public.email_workflow_nodes;
create policy email_workflow_nodes_delete_org on public.email_workflow_nodes
  for delete using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_nodes.workflow_id 
      and has_role(organization_id, 'manager')
    )
  );

-- RLS Policies for email_workflow_edges (inherited from workflow)
drop policy if exists email_workflow_edges_select_org on public.email_workflow_edges;
create policy email_workflow_edges_select_org on public.email_workflow_edges
  for select using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_edges.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_edges_insert_org on public.email_workflow_edges;
create policy email_workflow_edges_insert_org on public.email_workflow_edges
  for insert with check (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_edges.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_edges_update_org on public.email_workflow_edges;
create policy email_workflow_edges_update_org on public.email_workflow_edges
  for update using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_edges.workflow_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_workflow_edges_delete_org on public.email_workflow_edges;
create policy email_workflow_edges_delete_org on public.email_workflow_edges
  for delete using (
    exists (
      select 1 from public.email_workflows_enhanced 
      where id = email_workflow_edges.workflow_id 
      and has_role(organization_id, 'manager')
    )
  );

-- RLS Policies for email_templates_enhanced
drop policy if exists email_templates_enhanced_select_org on public.email_templates_enhanced;
create policy email_templates_enhanced_select_org on public.email_templates_enhanced
  for select using (public.is_org_member(organization_id));

drop policy if exists email_templates_enhanced_insert_org on public.email_templates_enhanced;
create policy email_templates_enhanced_insert_org on public.email_templates_enhanced
  for insert with check (public.is_org_member(organization_id));

drop policy if exists email_templates_enhanced_update_org on public.email_templates_enhanced;
create policy email_templates_enhanced_update_org on public.email_templates_enhanced
  for update using (public.is_org_member(organization_id));

drop policy if exists email_templates_enhanced_delete_org on public.email_templates_enhanced;
create policy email_templates_enhanced_delete_org on public.email_templates_enhanced
  for delete using (public.has_role(organization_id, 'manager'));

-- RLS Policies for email_template_blocks (inherited from template)
drop policy if exists email_template_blocks_select_org on public.email_template_blocks;
create policy email_template_blocks_select_org on public.email_template_blocks
  for select using (
    exists (
      select 1 from public.email_templates_enhanced 
      where id = email_template_blocks.template_id 
      and is_org_member(organization_id)
    )
  );

drop policy if exists email_template_blocks_insert_org on public.email_template_blocks;
create policy email_template_blocks_insert_org on public.email_template_blocks
  for insert with check (
    exists (
      select 1 from public.email_templates_enhanced 
      where id = email_template_blocks.template_id 
      and is_org_member(organization_id)
    )
  );

-- RLS Policies for workflow runs
drop policy if exists email_workflow_runs_enhanced_select_org on public.email_workflow_runs_enhanced;
create policy email_workflow_runs_enhanced_select_org on public.email_workflow_runs_enhanced
  for select using (public.is_org_member(organization_id));

drop policy if exists email_workflow_runs_enhanced_insert_org on public.email_workflow_runs_enhanced;
create policy email_workflow_runs_enhanced_insert_org on public.email_workflow_runs_enhanced
  for insert with check (public.is_org_member(organization_id));

-- RLS Policies for workflow step logs (inherited from run)
drop policy if exists email_workflow_step_logs_select_org on public.email_workflow_step_logs;
create policy email_workflow_step_logs_select_org on public.email_workflow_step_logs
  for select using (
    exists (
      select 1 from public.email_workflow_runs_enhanced 
      where id = email_workflow_step_logs.run_id 
      and is_org_member(organization_id)
    )
  );

-- Grants
grant select, insert, update, delete on public.email_workflows_enhanced to authenticated, service_role;
grant select, insert, update, delete on public.email_workflow_nodes to authenticated, service_role;
grant select, insert, update, delete on public.email_workflow_edges to authenticated, service_role;
grant select, insert, update, delete on public.email_templates_enhanced to authenticated, service_role;
grant select, insert, update, delete on public.email_template_blocks to authenticated, service_role;
grant select, insert on public.email_workflow_runs_enhanced to authenticated, service_role;
grant select, insert on public.email_workflow_step_logs to authenticated, service_role;

-- Helper function to increment workflow run count
create or replace function public.run_workflow_increment_enhanced(p_workflow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_workflows_enhanced 
  set run_count = run_count + 1, last_run_at = now() 
  where id = p_workflow_id;
end;
$$;

grant execute on function public.run_workflow_increment_enhanced(uuid) to authenticated, service_role;

-- Helper function to increment template usage count
create or replace function public.increment_template_usage(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_templates_enhanced 
  set usage_count = usage_count + 1 
  where id = p_template_id;
end;
$$;

grant execute on function public.increment_template_usage(uuid) to authenticated, service_role;