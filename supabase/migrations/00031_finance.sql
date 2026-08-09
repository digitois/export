-- ------------------------------------------------------------------
-- Export OS - 00031: Finance (expenses + light P&L read model)
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'expense_category' and n.nspname = 'public') then
    create type public.expense_category as enum (
      'raw_materials', 'packaging', 'freight', 'customs', 'warehousing',
      'marketing', 'travel', 'office', 'salaries', 'commission',
      'insurance', 'bank_charges', 'utilities', 'other'
    );
  end if;
end $$;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category public.expense_category not null default 'other',
  vendor text,
  amount numeric(18, 4) not null default 0,
  currency char(3) not null default 'USD',
  expense_date date not null default current_date,
  notes text,
  attachment_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function set_updated_at();

create index if not exists idx_expenses_org on public.expenses (organization_id);
create index if not exists idx_expenses_org_date on public.expenses (organization_id, expense_date desc);
create index if not exists idx_expenses_org_category on public.expenses (organization_id, category);

alter table public.expenses enable row level security;

drop policy if exists expenses_select_org on public.expenses;
create policy expenses_select_org on public.expenses
  for select using (public.is_org_member(organization_id));
drop policy if exists expenses_insert_org on public.expenses;
create policy expenses_insert_org on public.expenses
  for insert with check (public.is_org_member(organization_id));
drop policy if exists expenses_update_org on public.expenses;
create policy expenses_update_org on public.expenses
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists expenses_delete_org on public.expenses;
create policy expenses_delete_org on public.expenses
  for delete using (public.has_role(organization_id, 'manager'));

-- Cash-flow and P&L are read over invoices (revenue), invoice_payments (cash in)
-- and expenses (cash out). No extra tables required; the finance service
-- aggregates these in application code.
