-- ------------------------------------------------------------------
-- Export OS - 00018: Public views, grants, search indexes
-- ------------------------------------------------------------------

create extension if not exists "pg_trgm";

-- ------------------------------------------------------------------
-- Public-facing view of a published exporter website.
-- Created as owner (security definer semantics) so published sites
-- can be read by anonymous visitors without exposing private data.
-- ------------------------------------------------------------------
create or replace view public.public_sites as
select
  o.id as organization_id,
  o.name as company_name,
  o.logo_url,
  o.website_subdomain,
  o.slug,
  o.default_currency,
  ws.theme,
  ws.primary_color,
  ws.accent_color,
  ws.hero_heading,
  ws.hero_subheading,
  ws.hero_image_url,
  ws.announcement_bar,
  ws.show_inquiry_form,
  ws.contact_email,
  ws.contact_phone,
  ws.whatsapp_number,
  ws.custom_domain,
  ws.custom_footer,
  cp.about,
  cp.tagline,
  cp.export_markets,
  cp.product_categories,
  cp.certifications,
  cp.social_links,
  cp.address_line1,
  cp.city,
  cp.state,
  cp.country,
  cp.pincode,
  cp.iec_number,
  cp.website,
  cp.contact_person,
  cp.email,
  cp.phone
from public.organizations o
join public.website_settings ws on ws.organization_id = o.id and ws.is_published = true
left join public.company_profiles cp on cp.organization_id = o.id;

-- ------------------------------------------------------------------
-- Grants: anon (public website) + authenticated (app)
-- ------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Tables readable/writable by anon for the public website experience
grant select on public.public_sites to anon, authenticated;
grant select on public.products to anon;
grant select on public.product_categories to anon;
grant select on public.product_media to anon;
grant select on public.blog_posts to anon;
grant insert on public.leads to anon;
grant insert on public.website_visits to anon;
grant select on public.plans to anon, authenticated;

-- Tables used by authenticated users
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated;
grant usage on all sequences in schema public to service_role;

-- ------------------------------------------------------------------
-- Search indexes (pg_trgm)
-- ------------------------------------------------------------------
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_buyers_company_trgm on public.buyers using gin (company_name gin_trgm_ops);
create index if not exists idx_leads_buyer_name_trgm on public.leads using gin (buyer_name gin_trgm_ops);

-- ------------------------------------------------------------------
-- Default data
-- ------------------------------------------------------------------
insert into public.plans (name, code, description, price_monthly, price_annual, currency, features, limits, sort_order)
values
  ('Starter', 'starter', 'For new exporters getting started', 999, 9990, 'INR',
   '["Export website","Product management","Lead management","Quotations & invoices","1 team member","Email support"]'::jsonb,
   '{"users": 1, "products": 50, "leads": 500, "blog_posts": 10, "email_credits": 500, "ai_credits": 2000, "storage_gb": 5}'::jsonb, 1),
  ('Professional', 'professional', 'For growing exporters', 2499, 24990, 'INR',
   '["Everything in Starter","Custom domain","Team up to 10 members","AI export assistant","Email marketing","Advanced analytics","Priority support"]'::jsonb,
   '{"users": 10, "products": 1000, "leads": 10000, "blog_posts": 100, "email_credits": 5000, "ai_credits": 20000, "storage_gb": 50}'::jsonb, 2),
  ('Enterprise', 'enterprise', 'For large export houses', 7499, 74990, 'INR',
   '["Everything in Professional","Unlimited team members","Dedicated account manager","API access","Custom integrations","SLA support"]'::jsonb,
   '{"users": -1, "products": 100000, "leads": 1000000, "blog_posts": -1, "email_credits": 50000, "ai_credits": 200000, "storage_gb": 500}'::jsonb, 3)
on conflict (code) do nothing;

insert into public.feature_flags (key, enabled, description)
values
  ('ai_assistant', true, 'Enable the AI export assistant for all organizations'),
  ('blog_generator', true, 'Enable AI blog generator'),
  ('email_marketing', true, 'Enable email marketing module'),
  ('custom_domains', true, 'Enable custom domain binding for websites')
on conflict (key) do nothing;

insert into public.announcements (title, body, level, is_active, starts_at)
values ('Welcome to Export OS', 'Set up your company profile to unlock your free export website.', 'info', true, now())
on conflict do nothing;
