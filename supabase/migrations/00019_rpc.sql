-- ------------------------------------------------------------------
-- Export OS - 00019: RPC functions
-- ------------------------------------------------------------------

-- Increment blog post view count (used by public sites)
create or replace function public.increment_blog_views(p_org_id uuid, p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.blog_posts
  set view_count = view_count + 1
  where id = p_post_id and organization_id = p_org_id;
end;
$$;

grant execute on function public.increment_blog_views(uuid, uuid) to anon, authenticated;

-- Organization usage snapshot (leads/products/etc counts)
create or replace function public.organization_usage(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'leads', (select count(*) from public.leads where organization_id = p_org_id),
    'products', (select count(*) from public.products where organization_id = p_org_id),
    'buyers', (select count(*) from public.buyers where organization_id = p_org_id),
    'blog_posts', (select count(*) from public.blog_posts where organization_id = p_org_id),
    'quotations', (select count(*) from public.quotations where organization_id = p_org_id),
    'invoices', (select count(*) from public.invoices where organization_id = p_org_id),
    'documents', (select count(*) from public.documents where organization_id = p_org_id),
    'members', (select count(*) from public.organization_members where organization_id = p_org_id and status = 'active')
  ) into result;
  return result;
end;
$$;

grant execute on function public.organization_usage(uuid) to authenticated;

-- Search organizations by query (admin)
create or replace function public.admin_search_organizations(p_query text)
returns setof public.organizations
language sql
stable
security definer
set search_path = public
as $$
  select * from public.organizations o
  where o.name ilike '%' || p_query || '%'
     or o.slug ilike '%' || p_query || '%'
  order by o.created_at desc
  limit 50;
$$;

grant execute on function public.admin_search_organizations(text) to service_role;

-- Monthly revenue aggregate for analytics
create or replace function public.analytics_monthly_revenue(p_org_id uuid, p_months int)
returns table (month text, revenue numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
    coalesce(sum(total), 0) as revenue
  from public.invoices
  where organization_id = p_org_id
    and created_at >= date_trunc('month', now()) - (p_months || ' months')::interval
    and status in ('paid', 'partially_paid', 'sent')
  group by 1
  order by 1;
$$;

grant execute on function public.analytics_monthly_revenue(uuid, int) to authenticated;
