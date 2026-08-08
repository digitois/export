-- ------------------------------------------------------------------
-- Export OS - 00015: Billing (Plans, Subscriptions, Payments - Razorpay)
-- ------------------------------------------------------------------

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique, -- starter | professional | enterprise
  description text,
  price_monthly numeric(12, 2) not null default 0,
  price_annual numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb, -- { products: n, leads: n, email: n, ai_tokens: n, users: n }
  razorpay_plan_id_monthly text,
  razorpay_plan_id_annual text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'trialing',
  billing_cycle public.billing_cycle not null default 'monthly',
  razorpay_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  seats int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function set_updated_at();

create index if not exists idx_subscriptions_org on public.subscriptions (organization_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_subscriptions_rzp on public.subscriptions (razorpay_subscription_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  razorpay_subscription_id text,
  razorpay_invoice_id text,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'INR',
  status public.payment_status not null default 'created',
  method text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function set_updated_at();

create index if not exists idx_payments_org on public.payments (organization_id);
create index if not exists idx_payments_subscription on public.payments (subscription_id);
create index if not exists idx_payments_status on public.payments (status);

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- Plans are public (used for pricing page)
drop policy if exists plans_select_public on public.plans;
create policy plans_select_public on public.plans
  for select using (true);

drop policy if exists subscriptions_select_org on public.subscriptions;
create policy subscriptions_select_org on public.subscriptions
  for select using (public.is_org_member(organization_id));
drop policy if exists subscriptions_insert_org on public.subscriptions;
create policy subscriptions_insert_org on public.subscriptions
  for insert with check (public.is_org_member(organization_id));
drop policy if exists subscriptions_update_admin on public.subscriptions;
create policy subscriptions_update_admin on public.subscriptions
  for update using (public.has_role(organization_id, 'admin'));

drop policy if exists payments_select_org on public.payments;
create policy payments_select_org on public.payments
  for select using (public.is_org_member(organization_id));
drop policy if exists payments_insert_org on public.payments;
create policy payments_insert_org on public.payments
  for insert with check (public.is_org_member(organization_id));
