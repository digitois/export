-- ------------------------------------------------------------------
-- Export OS - 00032: Inventory & Warehouse
-- ------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'stock_movement_type' and n.nspname = 'public') then
    create type public.stock_movement_type as enum ('in', 'out', 'adjustment');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'purchase_order_status' and n.nspname = 'public') then
    create type public.purchase_order_status as enum ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled');
  end if;
end $$;

-- Warehouses
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  location text,
  is_default boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_warehouses_updated_at on public.warehouses;
create trigger trg_warehouses_updated_at before update on public.warehouses
  for each row execute function set_updated_at();

create index if not exists idx_warehouses_org on public.warehouses (organization_id);

-- Stock levels per product per warehouse
create table if not exists public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  quantity numeric(18, 4) not null default 0,
  reorder_point numeric(18, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);

drop trigger if exists trg_stock_levels_updated_at on public.stock_levels;
create trigger trg_stock_levels_updated_at before update on public.stock_levels
  for each row execute function set_updated_at();

create index if not exists idx_stock_levels_org on public.stock_levels (organization_id);
create index if not exists idx_stock_levels_warehouse on public.stock_levels (warehouse_id);
create index if not exists idx_stock_levels_product on public.stock_levels (product_id);

-- Stock movements (audit trail)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  type public.stock_movement_type not null,
  quantity numeric(18, 4) not null,
  reference_type text,        -- 'purchase_order', 'shipment', 'adjustment', etc.
  reference_id uuid,          -- id of the reference document
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_org on public.stock_movements (organization_id);
create index if not exists idx_stock_movements_warehouse on public.stock_movements (warehouse_id);
create index if not exists idx_stock_movements_product on public.stock_movements (product_id);
create index if not exists idx_stock_movements_occurred on public.stock_movements (organization_id, occurred_at desc);
create index if not exists idx_stock_movements_reference on public.stock_movements (reference_type, reference_id);

-- Suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  country text,
  gst_number text,
  payment_terms text,
  currency char(3) not null default 'USD',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function set_updated_at();

create index if not exists idx_suppliers_org on public.suppliers (organization_id);

-- Purchase orders (mirror invoices/quotations shape)
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  po_number text not null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  supplier_name text not null,
  supplier_company text,
  supplier_address text,
  supplier_country text,
  warehouse_id uuid references public.warehouses (id) on delete set null,
  currency char(3) not null default 'USD',
  status public.purchase_order_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  subtotal numeric(18, 4) not null default 0,
  discount numeric(18, 4) not null default 0,
  tax numeric(18, 4) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  shipping_charges numeric(18, 4) not null default 0,
  total numeric(18, 4) not null default 0,
  notes text,
  terms text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function set_updated_at();

create index if not exists idx_purchase_orders_org on public.purchase_orders (organization_id);
create index if not exists idx_purchase_orders_org_status on public.purchase_orders (organization_id, status);
create index if not exists idx_purchase_orders_number on public.purchase_orders (organization_id, po_number);
create index if not exists idx_purchase_orders_supplier on public.purchase_orders (organization_id, supplier_id);

-- Purchase order items
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  hsn_code text,
  quantity numeric(18, 4) not null default 1,
  unit text,
  unit_price numeric(18, 4) not null default 0,
  amount numeric(18, 4) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  received_quantity numeric(18, 4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_po_items_org on public.purchase_order_items (organization_id);
create index if not exists idx_po_items_order on public.purchase_order_items (purchase_order_id);

alter table public.warehouses enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Warehouses policies
drop policy if exists warehouses_select_org on public.warehouses;
create policy warehouses_select_org on public.warehouses
  for select using (public.is_org_member(organization_id));
drop policy if exists warehouses_insert_org on public.warehouses;
create policy warehouses_insert_org on public.warehouses
  for insert with check (public.is_org_member(organization_id));
drop policy if exists warehouses_update_org on public.warehouses;
create policy warehouses_update_org on public.warehouses
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists warehouses_delete_org on public.warehouses;
create policy warehouses_delete_org on public.warehouses
  for delete using (public.has_role(organization_id, 'manager'));

-- Stock levels policies
drop policy if exists stock_levels_select_org on public.stock_levels;
create policy stock_levels_select_org on public.stock_levels
  for select using (public.is_org_member(organization_id));
drop policy if exists stock_levels_insert_org on public.stock_levels;
create policy stock_levels_insert_org on public.stock_levels
  for insert with check (public.is_org_member(organization_id));
drop policy if exists stock_levels_update_org on public.stock_levels;
create policy stock_levels_update_org on public.stock_levels
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists stock_levels_delete_org on public.stock_levels;
create policy stock_levels_delete_org on public.stock_levels
  for delete using (public.has_role(organization_id, 'manager'));

-- Stock movements policies
drop policy if exists stock_movements_select_org on public.stock_movements;
create policy stock_movements_select_org on public.stock_movements
  for select using (public.is_org_member(organization_id));
drop policy if exists stock_movements_insert_org on public.stock_movements;
create policy stock_movements_insert_org on public.stock_movements
  for insert with check (public.is_org_member(organization_id));
drop policy if exists stock_movements_update_org on public.stock_movements;
create policy stock_movements_update_org on public.stock_movements
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists stock_movements_delete_org on public.stock_movements;
create policy stock_movements_delete_org on public.stock_movements
  for delete using (public.has_role(organization_id, 'manager'));

-- Suppliers policies
drop policy if exists suppliers_select_org on public.suppliers;
create policy suppliers_select_org on public.suppliers
  for select using (public.is_org_member(organization_id));
drop policy if exists suppliers_insert_org on public.suppliers;
create policy suppliers_insert_org on public.suppliers
  for insert with check (public.is_org_member(organization_id));
drop policy if exists suppliers_update_org on public.suppliers;
create policy suppliers_update_org on public.suppliers
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists suppliers_delete_org on public.suppliers;
create policy suppliers_delete_org on public.suppliers
  for delete using (public.has_role(organization_id, 'manager'));

-- Purchase orders policies
drop policy if exists purchase_orders_select_org on public.purchase_orders;
create policy purchase_orders_select_org on public.purchase_orders
  for select using (public.is_org_member(organization_id));
drop policy if exists purchase_orders_insert_org on public.purchase_orders;
create policy purchase_orders_insert_org on public.purchase_orders
  for insert with check (public.is_org_member(organization_id));
drop policy if exists purchase_orders_update_org on public.purchase_orders;
create policy purchase_orders_update_org on public.purchase_orders
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists purchase_orders_delete_org on public.purchase_orders;
create policy purchase_orders_delete_org on public.purchase_orders
  for delete using (public.has_role(organization_id, 'manager'));

-- Purchase order items policies
drop policy if exists po_items_select_org on public.purchase_order_items;
create policy po_items_select_org on public.purchase_order_items
  for select using (public.is_org_member(organization_id));
drop policy if exists po_items_insert_org on public.purchase_order_items;
create policy po_items_insert_org on public.purchase_order_items
  for insert with check (public.is_org_member(organization_id));
drop policy if exists po_items_update_org on public.purchase_order_items;
create policy po_items_update_org on public.purchase_order_items
  for update using (public.has_role(organization_id, 'employee'));
drop policy if exists po_items_delete_org on public.purchase_order_items;
create policy po_items_delete_org on public.purchase_order_items
  for delete using (public.has_role(organization_id, 'manager'));