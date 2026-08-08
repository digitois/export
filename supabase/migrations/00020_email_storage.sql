-- ------------------------------------------------------------------
-- Export OS - 00020: Email campaign counter + storage buckets
-- ------------------------------------------------------------------

create or replace function public.increment_campaign_counter(p_campaign_id uuid, p_column text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format(
    'update public.email_campaigns set %I = %I + 1 where id = $1',
    p_column, p_column
  ) using p_campaign_id;
end;
$$;

grant execute on function public.increment_campaign_counter(uuid, text) to authenticated, service_role;

-- Storage buckets referenced by the app
insert into storage.buckets (id, name, public)
values
  ('company', 'company', true),
  ('products', 'products', true),
  ('documents', 'documents', false),
  ('leads', 'leads', false),
  ('blog', 'blog', true),
  ('generated', 'generated', true)
on conflict (id) do nothing;

-- Documents bucket is private to org members
drop policy if exists "documents_org_access" on storage.objects;
create policy "documents_org_access" on storage.objects
  for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1]::uuid in (
    select m.organization_id from public.organization_members m where m.user_id = auth.uid()
  ))
  with check (bucket_id = 'documents' and (storage.foldername(name))[1]::uuid in (
    select m.organization_id from public.organization_members m where m.user_id = auth.uid()
  ));

-- Public buckets readable by everyone
drop policy if exists "public_buckets_read" on storage.objects;
create policy "public_buckets_read" on storage.objects
  for select
  using (bucket_id in ('company', 'products', 'blog', 'generated'));

drop policy if exists "org_upload_public_buckets" on storage.objects;
create policy "org_upload_public_buckets" on storage.objects
  for insert
  with check (bucket_id in ('company', 'products', 'blog', 'generated') and (
    select m.organization_id from public.organization_members m
    where m.user_id = auth.uid() and m.organization_id::text = (storage.foldername(name))[1]
    limit 1
  ) is not null);
