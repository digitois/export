-- ------------------------------------------------------------------
-- Export OS - 00041: Sequences (Linear Multi-step Outreach)
--
-- Simpler than drip_campaigns: linear delay + send_email steps,
-- designed for the visual SequenceBuilder (geniusCampaign style)
-- ------------------------------------------------------------------

-- Sequence table
create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  step_count int not null default 0,
  enrolled_count int not null default 0,
  open_count int not null default 0,
  has_active_enrollments boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sequence steps: either 'wait' (delay) or 'send_email'
create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  type text not null check (type in ('wait', 'send_email')),
  position int not null default 0,
  delay_value int,
  delay_unit text check (delay_unit in ('minutes', 'hours', 'days')),
  template_id uuid references public.email_templates (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Sequence enrollments
create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  contact_id uuid not null references public.email_contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  current_step_id uuid references public.sequence_steps (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'stopped', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique(sequence_id, contact_id)
);

-- Indexes
create index if not exists idx_sequences_org on public.sequences (organization_id, is_active);
create index if not exists idx_sequence_steps_sequence on public.sequence_steps (sequence_id, position);
create index if not exists idx_sequence_enrollments_sequence on public.sequence_enrollments (sequence_id, status);
create index if not exists idx_sequence_enrollments_contact on public.sequence_enrollments (contact_id);
create index if not exists idx_sequence_enrollments_current_step on public.sequence_enrollments (current_step_id);

-- Trigger for updated_at
drop trigger if exists trg_sequences_updated_at on public.sequences;
create trigger trg_sequences_updated_at before update on public.sequences
  for each row execute function set_updated_at();

-- RLS
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;

-- Sequences policies
drop policy if exists sequences_select_org on public.sequences;
create policy sequences_select_org on public.sequences
  for select using (public.is_org_member(organization_id));

drop policy if exists sequences_insert_org on public.sequences;
create policy sequences_insert_org on public.sequences
  for insert with check (public.is_org_member(organization_id));

drop policy if exists sequences_update_org on public.sequences;
create policy sequences_update_org on public.sequences
  for update using (public.is_org_member(organization_id));

drop policy if exists sequences_delete_org on public.sequences;
create policy sequences_delete_org on public.sequences
  for delete using (public.has_role(organization_id, 'manager'));

-- Sequence steps policies (inherit from sequence)
drop policy if exists sequence_steps_select_org on public.sequence_steps;
create policy sequence_steps_select_org on public.sequence_steps
  for select using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_insert_org on public.sequence_steps;
create policy sequence_steps_insert_org on public.sequence_steps
  for insert with check (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_update_org on public.sequence_steps;
create policy sequence_steps_update_org on public.sequence_steps
  for update using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_steps_delete_org on public.sequence_steps;
create policy sequence_steps_delete_org on public.sequence_steps
  for delete using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_steps.sequence_id
      and has_role(s.organization_id, 'manager')
    )
  );

-- Sequence enrollments policies
drop policy if exists sequence_enrollments_select_org on public.sequence_enrollments;
create policy sequence_enrollments_select_org on public.sequence_enrollments
  for select using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_insert_org on public.sequence_enrollments;
create policy sequence_enrollments_insert_org on public.sequence_enrollments
  for insert with check (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_update_org on public.sequence_enrollments;
create policy sequence_enrollments_update_org on public.sequence_enrollments
  for update using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and is_org_member(s.organization_id)
    )
  );

drop policy if exists sequence_enrollments_delete_org on public.sequence_enrollments;
create policy sequence_enrollments_delete_org on public.sequence_enrollments
  for delete using (
    exists (
      select 1 from public.sequences s
      where s.id = sequence_enrollments.sequence_id
      and has_role(s.organization_id, 'manager')
    )
  );

-- Grants
grant select, insert, update, delete on public.sequences to authenticated, service_role;
grant select, insert, update, delete on public.sequence_steps to authenticated, service_role;
grant select, insert, update, delete on public.sequence_enrollments to authenticated, service_role;

-- Helper function to increment sequence counters
create or replace function public.increment_sequence_counters(p_sequence_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sequences
  set 
    step_count = (select count(*) from public.sequence_steps where sequence_id = p_sequence_id),
    enrolled_count = (select count(*) from public.sequence_enrollments where sequence_id = p_sequence_id),
    has_active_enrollments = exists(
      select 1 from public.sequence_enrollments 
      where sequence_id = p_sequence_id and status in ('active', 'paused')
    ),
    open_count = (
      select count(*) from public.email_activities ea
      join public.sequence_enrollments se on ea.contact_id = se.contact_id
      where se.sequence_id = p_sequence_id
      and ea.event = 'opened'
    )
  where id = p_sequence_id;
end;
$$;

grant execute on function public.increment_sequence_counters(uuid) to authenticated, service_role;