-- ------------------------------------------------------------------
-- Export OS - 00025: Email Workflows (GoHighLevel-style automation)
--
-- Trigger-based email automations: when a lead is created, a status
-- changes, or a website inquiry arrives, the workflow can add the
-- contact to a list and/or send an email from a template. Execution
-- is handled server-side by src/lib/services/workflows.ts.
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'workflow_trigger' and n.nspname = 'public') then
    create type public.workflow_trigger as enum ('lead_created', 'lead_status_changed', 'inquiry_received');
  end if;
end $$;

create table if not exists public.email_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  trigger_type public.workflow_trigger not null,
  template_id uuid references public.email_templates (id) on delete set null,
  list_id uuid references public.contact_lists (id) on delete set null,
  config jsonb not null default '{}'::jsonb, -- conditions, e.g. {"status": "new"} or {"statuses": ["new","contacted"]}
  is_active boolean not null default true,
  run_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_workflows_updated_at on public.email_workflows;
create trigger trg_email_workflows_updated_at before update on public.email_workflows
  for each row execute function set_updated_at();

create index if not exists idx_email_workflows_org on public.email_workflows (organization_id, trigger_type);

-- Execution log: one row per contact that a workflow touched.
create table if not exists public.email_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workflow_id uuid references public.email_workflows (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  contact_id uuid references public.email_contacts (id) on delete set null,
  email text,
  status text, -- matched | sent | skipped
  detail text,
  ran_at timestamptz not null default now()
);

create index if not exists idx_email_workflow_runs_org on public.email_workflow_runs (organization_id);
create index if not exists idx_email_workflow_runs_workflow on public.email_workflow_runs (workflow_id);

alter table public.email_workflows enable row level security;
alter table public.email_workflow_runs enable row level security;

drop policy if exists email_workflows_select_org on public.email_workflows;
create policy email_workflows_select_org on public.email_workflows
  for select using (public.is_org_member(organization_id));
drop policy if exists email_workflows_insert_org on public.email_workflows;
create policy email_workflows_insert_org on public.email_workflows
  for insert with check (public.is_org_member(organization_id));
drop policy if exists email_workflows_update_org on public.email_workflows;
create policy email_workflows_update_org on public.email_workflows
  for update using (public.is_org_member(organization_id));
drop policy if exists email_workflows_delete_org on public.email_workflows;
create policy email_workflows_delete_org on public.email_workflows
  for delete using (public.has_role(organization_id, 'manager'));

drop policy if exists email_workflow_runs_select_org on public.email_workflow_runs;
create policy email_workflow_runs_select_org on public.email_workflow_runs
  for select using (public.is_org_member(organization_id));
drop policy if exists email_workflow_runs_insert_org on public.email_workflow_runs;
create policy email_workflow_runs_insert_org on public.email_workflow_runs
  for insert with check (public.is_org_member(organization_id));

grant select, insert, update, delete on public.email_workflows to authenticated, service_role;
grant select, insert on public.email_workflow_runs to authenticated, service_role;

-- Convenience RPC so workflows can be re-run / counted atomically.
create or replace function public.run_workflow_increment(p_workflow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_workflows set run_count = run_count + 1 where id = p_workflow_id;
end;
$$;

grant execute on function public.run_workflow_increment(uuid) to authenticated, service_role;