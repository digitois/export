-- ------------------------------------------------------------------
-- Export OS - 00036: HRM — Employees, Attendance, Leave, Payroll-lite
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'employment_status' and n.nspname = 'public') then
    create type public.employment_status as enum ('active', 'on_leave', 'terminated');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'leave_status' and n.nspname = 'public') then
    create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'payroll_status' and n.nspname = 'public') then
    create type public.payroll_status as enum ('draft', 'paid', 'cancelled');
  end if;
end $$;

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_code text not null,
  full_name text not null,
  email text,
  phone text,
  designation text,
  department text,
  joining_date date,
  status public.employment_status not null default 'active',
  base_salary numeric(18, 2) not null default 0,
  currency char(3) not null default 'USD',
  bank_name text,
  bank_account text,
  bank_ifsc text,
  address text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at before update on public.employees
  for each row execute function set_updated_at();

create index if not exists idx_employees_org on public.employees (organization_id);
create index if not exists idx_employees_org_status on public.employees (organization_id, status);
create index if not exists idx_employees_code on public.employees (organization_id, employee_code);

-- Attendance
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present',  -- present | absent | half_day | leave
  hours_worked numeric(6, 2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, attendance_date)
);

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at before update on public.attendance
  for each row execute function set_updated_at();

create index if not exists idx_attendance_org on public.attendance (organization_id);
create index if not exists idx_attendance_employee on public.attendance (organization_id, employee_id, attendance_date);

-- Leave requests
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type text not null,  -- annual | sick | casual | unpaid | other
  start_date date not null,
  end_date date not null,
  days numeric(5, 1) not null default 1,
  reason text,
  status public.leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_check check (end_date >= start_date)
);

drop trigger if exists trg_leave_requests_updated_at on public.leave_requests;
create trigger trg_leave_requests_updated_at before update on public.leave_requests
  for each row execute function set_updated_at();

create index if not exists idx_leave_requests_org on public.leave_requests (organization_id);
create index if not exists idx_leave_requests_employee on public.leave_requests (organization_id, employee_id);
create index if not exists idx_leave_requests_status on public.leave_requests (organization_id, status);

-- Payroll runs
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  run_date date not null default current_date,
  status public.payroll_status not null default 'draft',
  total_amount numeric(18, 2) not null default 0,
  currency char(3) not null default 'USD',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_period_check check (period_end >= period_start)
);

drop trigger if exists trg_payroll_runs_updated_at on public.payroll_runs;
create trigger trg_payroll_runs_updated_at before update on public.payroll_runs
  for each row execute function set_updated_at();

create index if not exists idx_payroll_runs_org on public.payroll_runs (organization_id);
create index if not exists idx_payroll_runs_org_period on public.payroll_runs (organization_id, period_start, period_end);

-- Payroll lines
create table if not exists public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  gross numeric(18, 2) not null default 0,
  allowances numeric(18, 2) not null default 0,
  deductions numeric(18, 2) not null default 0,
  net numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

create index if not exists idx_payroll_lines_org on public.payroll_lines (organization_id);
create index if not exists idx_payroll_lines_run on public.payroll_lines (payroll_run_id);

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_lines enable row level security;

-- Employees policies
drop policy if exists employees_select_org on public.employees;
create policy employees_select_org on public.employees
  for select using (public.is_org_member(organization_id));
drop policy if exists employees_insert_org on public.employees;
create policy employees_insert_org on public.employees
  for insert with check (public.is_org_member(organization_id));
drop policy if exists employees_update_org on public.employees;
create policy employees_update_org on public.employees
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists employees_delete_org on public.employees;
create policy employees_delete_org on public.employees
  for delete using (public.has_role(organization_id, 'manager'));

-- Attendance policies
drop policy if exists attendance_select_org on public.attendance;
create policy attendance_select_org on public.attendance
  for select using (public.is_org_member(organization_id));
drop policy if exists attendance_insert_org on public.attendance;
create policy attendance_insert_org on public.attendance
  for insert with check (public.is_org_member(organization_id));
drop policy if exists attendance_update_org on public.attendance;
create policy attendance_update_org on public.attendance
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists attendance_delete_org on public.attendance;
create policy attendance_delete_org on public.attendance
  for delete using (public.has_role(organization_id, 'manager'));

-- Leave requests policies
drop policy if exists leave_requests_select_org on public.leave_requests;
create policy leave_requests_select_org on public.leave_requests
  for select using (public.is_org_member(organization_id));
drop policy if exists leave_requests_insert_org on public.leave_requests;
create policy leave_requests_insert_org on public.leave_requests
  for insert with check (public.is_org_member(organization_id));
drop policy if exists leave_requests_update_org on public.leave_requests;
create policy leave_requests_update_org on public.leave_requests
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists leave_requests_delete_org on public.leave_requests;
create policy leave_requests_delete_org on public.leave_requests
  for delete using (public.has_role(organization_id, 'manager'));

-- Payroll runs policies
drop policy if exists payroll_runs_select_org on public.payroll_runs;
create policy payroll_runs_select_org on public.payroll_runs
  for select using (public.is_org_member(organization_id));
drop policy if exists payroll_runs_insert_org on public.payroll_runs;
create policy payroll_runs_insert_org on public.payroll_runs
  for insert with check (public.has_role(organization_id, 'manager'));
drop policy if exists payroll_runs_update_org on public.payroll_runs;
create policy payroll_runs_update_org on public.payroll_runs
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists payroll_runs_delete_org on public.payroll_runs;
create policy payroll_runs_delete_org on public.payroll_runs
  for delete using (public.has_role(organization_id, 'manager'));

-- Payroll lines policies
drop policy if exists payroll_lines_select_org on public.payroll_lines;
create policy payroll_lines_select_org on public.payroll_lines
  for select using (public.is_org_member(organization_id));
drop policy if exists payroll_lines_insert_org on public.payroll_lines;
create policy payroll_lines_insert_org on public.payroll_lines
  for insert with check (public.has_role(organization_id, 'manager'));
drop policy if exists payroll_lines_update_org on public.payroll_lines;
create policy payroll_lines_update_org on public.payroll_lines
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists payroll_lines_delete_org on public.payroll_lines;
create policy payroll_lines_delete_org on public.payroll_lines
  for delete using (public.has_role(organization_id, 'manager'));
