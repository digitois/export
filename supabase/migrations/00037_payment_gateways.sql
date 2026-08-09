-- ------------------------------------------------------------------
-- Export OS - 00037: Payment Gateways — per-org config + generic ids
-- ------------------------------------------------------------------

-- Per-organization payment gateway configuration. Credentials are stored
-- per provider so each tenant can enable Razorpay, Stripe, PhonePe,
-- Cashfree or Instamojo independently.
create table if not exists public.payment_gateways (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null, -- razorpay | stripe | phonepe | cashfree | instamojo
  enabled boolean not null default false,
  is_default boolean not null default false,
  test_mode boolean not null default true,
  config jsonb not null default '{}'::jsonb, -- { key_id, key_secret, merchant_id, salt, salt_index, webhook_secret, api_key, auth_token, publishable_key }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

drop trigger if exists trg_payment_gateways_updated_at on public.payment_gateways;
create trigger trg_payment_gateways_updated_at before update on public.payment_gateways
  for each row execute function set_updated_at();

create index if not exists idx_payment_gateways_org on public.payment_gateways (organization_id);
create index if not exists idx_payment_gateways_org_default on public.payment_gateways (organization_id, is_default) where is_default;

-- Generic gateway fields on payments (kept alongside the legacy razorpay_* columns)
alter table public.payments add column if not exists gateway text not null default 'razorpay';
alter table public.payments add column if not exists provider_order_id text;
alter table public.payments add column if not exists provider_payment_id text;

create index if not exists idx_payments_gateway on public.payments (gateway);
create index if not exists idx_payments_provider_order on public.payments (provider_order_id) where provider_order_id is not null;
create index if not exists idx_payments_provider_payment on public.payments (provider_payment_id) where provider_payment_id is not null;

alter table public.payment_gateways enable row level security;

drop policy if exists payment_gateways_select_org on public.payment_gateways;
create policy payment_gateways_select_org on public.payment_gateways
  for select using (public.is_org_member(organization_id));
drop policy if exists payment_gateways_insert_org on public.payment_gateways;
create policy payment_gateways_insert_org on public.payment_gateways
  for insert with check (public.is_org_member(organization_id));
drop policy if exists payment_gateways_update_org on public.payment_gateways;
create policy payment_gateways_update_org on public.payment_gateways
  for update using (public.has_role(organization_id, 'manager'));
drop policy if exists payment_gateways_delete_org on public.payment_gateways;
create policy payment_gateways_delete_org on public.payment_gateways
  for delete using (public.has_role(organization_id, 'manager'));

-- Ensure only one default gateway per organization
create unique index if not exists uq_payment_gateways_one_default
  on public.payment_gateways (organization_id)
  where is_default;
