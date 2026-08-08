-- ------------------------------------------------------------------
-- Export OS - 00010: Document Management
-- ------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  folder_id uuid references public.document_folders (id) on delete set null,
  name text not null,
  document_type text not null default 'other', -- iec | gst | certificate | invoice | packing_list | shipping | contract | other
  description text,
  storage_path text not null,
  file_size bigint not null default 0,
  mime_type text,
  version int not null default 1,
  status public.document_status not null default 'active',
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_documents_updated_at before update on public.documents
  for each row execute function set_updated_at();

create index idx_documents_org on public.documents (organization_id);
create index idx_documents_org_type on public.documents (organization_id, document_type);
create index idx_documents_folder on public.documents (folder_id);

create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id uuid references public.document_folders (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_document_folders_org on public.document_folders (organization_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_size bigint not null default 0,
  comment text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create index idx_document_versions_org on public.document_versions (organization_id);
create index idx_document_versions_document on public.document_versions (document_id);

alter table public.documents enable row level security;
alter table public.document_folders enable row level security;
alter table public.document_versions enable row level security;

create policy documents_select_org on public.documents
  for select using (public.is_org_member(organization_id));
create policy documents_insert_org on public.documents
  for insert with check (public.is_org_member(organization_id));
create policy documents_update_org on public.documents
  for update using (public.is_org_member(organization_id));
create policy documents_delete_org on public.documents
  for delete using (public.has_role(organization_id, 'manager'));

create policy document_folders_select_org on public.document_folders
  for select using (public.is_org_member(organization_id));
create policy document_folders_insert_org on public.document_folders
  for insert with check (public.is_org_member(organization_id));
create policy document_folders_update_org on public.document_folders
  for update using (public.is_org_member(organization_id));
create policy document_folders_delete_org on public.document_folders
  for delete using (public.has_role(organization_id, 'manager'));

create policy document_versions_select_org on public.document_versions
  for select using (public.is_org_member(organization_id));
create policy document_versions_insert_org on public.document_versions
  for insert with check (public.is_org_member(organization_id));
create policy document_versions_delete_org on public.document_versions
  for delete using (public.has_role(organization_id, 'admin'));
