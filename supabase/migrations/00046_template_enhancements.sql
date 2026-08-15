-- ------------------------------------------------------------------
-- Export OS - 00046: Template Enhancements (Tiptap + Variants + Blocks)
--
-- Tiptap JSON body, template variants for A/B testing,
-- drag-and-drop blocks library
-- ------------------------------------------------------------------

-- Template variants (A/B testing)
alter table public.email_templates
  add column if not exists parent_template_id uuid references public.email_templates (id) on delete set null,
  add column if not exists is_variant boolean not null default false,
  add column if not exists body_json jsonb, -- Tiptap ProseMirror JSON
  add column if not exists subject text,
  add column if not exists subject_text text,
  add column if not exists preview_text text,
  add column if not exists category text check (category in ('welcome', 'follow_up', 'promotion', 'announcement', 'transactional', 'newsletter')),
  add column if not exists thumbnail_url text,
  add column if not exists usage_count int not null default 0;

-- Template blocks (drag-and-drop components) - extends table created in 00039
-- Re-point template_id FK from email_templates_enhanced to email_templates
alter table public.email_template_blocks
  drop constraint if exists email_template_blocks_template_id_fkey;
alter table public.email_template_blocks
  add constraint email_template_blocks_template_id_fkey
  foreign key (template_id) references public.email_templates (id) on delete cascade;

-- Ensure allowed block_type values (00039 created this as plain text)
do $$
begin
  alter table public.email_template_blocks
    drop constraint if exists email_template_blocks_block_type_check;
exception when others then null;
end;
$$;

do $$
begin
  alter table public.email_template_blocks
    add constraint email_template_blocks_block_type_check
    check (block_type in ('text', 'image', 'button', 'divider', 'spacer', 'social', 'cta', 'html', 'personalization'));
exception when duplicate_object then null;
end;
$$;

-- Template library (prebuilt templates)
create table if not exists public.template_library (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text check (category in ('welcome', 'follow_up', 'promotion', 'announcement', 'transactional', 'newsletter')),
  subject text not null,
  preview_text text,
  body_json jsonb not null, -- Tiptap JSON
  thumbnail_url text,
  is_public boolean not null default true,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_email_templates_parent on public.email_templates (parent_template_id);
create index if not exists idx_email_templates_variant on public.email_templates (is_variant);
create index if not exists idx_email_templates_category on public.email_templates (category);
create index if not exists idx_email_template_blocks_template on public.email_template_blocks (template_id, position);
create index if not exists idx_template_library_category on public.template_library (category);
create index if not exists idx_template_library_public on public.template_library (is_public);

-- Trigger for updated_at
drop trigger if exists trg_email_template_blocks_updated_at on public.email_template_blocks;
create trigger trg_email_template_blocks_updated_at before update on public.email_template_blocks
  for each row execute function set_updated_at();

drop trigger if exists trg_template_library_updated_at on public.template_library;
create trigger trg_template_library_updated_at before update on public.template_library
  for each row execute function set_updated_at();

-- RLS
alter table public.email_template_blocks enable row level security;
alter table public.template_library enable row level security;

-- Email template blocks policies (inherit from template)
drop policy if exists email_template_blocks_select_org on public.email_template_blocks;
create policy email_template_blocks_select_org on public.email_template_blocks
  for select using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_insert_org on public.email_template_blocks;
create policy email_template_blocks_insert_org on public.email_template_blocks
  for insert with check (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_update_org on public.email_template_blocks;
create policy email_template_blocks_update_org on public.email_template_blocks
  for update using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and is_org_member(et.organization_id)
    )
  );

drop policy if exists email_template_blocks_delete_org on public.email_template_blocks;
create policy email_template_blocks_delete_org on public.email_template_blocks
  for delete using (
    exists (
      select 1 from public.email_templates et
      where et.id = email_template_blocks.template_id
      and has_role(et.organization_id, 'manager')
    )
  );

-- Template library: public read, org insert/update
drop policy if exists template_library_select_public on public.template_library;
create policy template_library_select_public on public.template_library
  for select using (is_public = true);

drop policy if exists template_library_select_org on public.template_library;
create policy template_library_select_org on public.template_library
  for select using (is_org_member(organization_id));

drop policy if exists template_library_insert_org on public.template_library;
create policy template_library_insert_org on public.template_library
  for insert with check (is_org_member(organization_id));

drop policy if exists template_library_update_org on public.template_library;
create policy template_library_update_org on public.template_library
  for update using (is_org_member(organization_id));

drop policy if exists template_library_delete_org on public.template_library;
create policy template_library_delete_org on public.template_library
  for delete using (has_role(organization_id, 'manager'));

-- Grants
grant select, insert, update, delete on public.email_template_blocks to authenticated, service_role;
grant select, insert, update, delete on public.template_library to authenticated, service_role;

-- Function to create template from library
create or replace function public.create_template_from_library(
  p_organization_id uuid,
  p_user_id uuid,
  p_library_slug text,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_library record;
  v_template_id uuid;
begin
  select * into v_library
  from public.template_library
  where slug = p_library_slug and is_public = true;

  if not found then
    raise exception 'Template not found: %', p_library_slug;
  end if;

  insert into public.email_templates (
    organization_id, name, subject, body_json, category, thumbnail_url,
    created_by, is_variant, parent_template_id
  ) values (
    p_organization_id,
    coalesce(p_name, v_library.name),
    v_library.subject,
    v_library.body_json,
    v_library.category,
    v_library.thumbnail_url,
    p_user_id,
    false,
    null
  ) returning id into v_template_id;

  return v_template_id;
end;
$$;

grant execute on function public.create_template_from_library(uuid, uuid, text, text) to authenticated, service_role;

-- Function to create template variant
create or replace function public.create_template_variant(
  p_organization_id uuid,
  p_user_id uuid,
  p_parent_template_id uuid,
  p_name text,
  p_subject text,
  p_body_json jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent record;
  v_variant_id uuid;
begin
  select * into v_parent
  from public.email_templates
  where id = p_parent_template_id and organization_id = p_organization_id;

  if not found then
    raise exception 'Parent template not found';
  end if;

  insert into public.email_templates (
    organization_id, name, subject, body_json, category, thumbnail_url,
    created_by, is_variant, parent_template_id
  ) values (
    p_organization_id,
    p_name,
    p_subject,
    p_body_json,
    v_parent.category,
    v_parent.thumbnail_url,
    p_user_id,
    true,
    p_parent_template_id
  ) returning id into v_variant_id;

  return v_variant_id;
end;
$$;

grant execute on function public.create_template_variant(uuid, uuid, uuid, text, text, jsonb) to authenticated, service_role;

-- Function to increment template usage
create or replace function public.increment_template_usage(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_templates
  set usage_count = usage_count + 1
  where id = p_template_id;
end;
$$;

grant execute on function public.increment_template_usage(uuid) to authenticated, service_role;