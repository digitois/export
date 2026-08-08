-- ------------------------------------------------------------------
-- Export OS - 00022: Public site read access
-- Anon visitors need to read product categories + media for published sites.
-- ------------------------------------------------------------------

-- Product categories: readable when the org has published products
drop policy if exists product_categories_select_public on public.product_categories;
create policy product_categories_select_public on public.product_categories
  for select using (public.has_published_products(organization_id));

drop policy if exists product_media_select_public on public.product_media;
create policy product_media_select_public on public.product_media
  for select using (public.has_published_products(organization_id));

-- Helper: does an organization have at least one published product?
create or replace function public.has_published_products(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has boolean;
begin
  select exists (
    select 1 from public.products p
    where p.organization_id = p_org_id
      and p.status = 'published'
  ) into v_has;
  return v_has;
end;
$$;

grant select on public.product_categories to anon;
grant select on public.product_media to anon;