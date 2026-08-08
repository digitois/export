-- ------------------------------------------------------------------
-- Export OS - Seed data
-- Run AFTER migrations. Creates a demo organization with sample data.
-- Demo credentials:
--   owner@exportos.demo / Export@123
--   manager@exportos.demo / Export@123
-- ------------------------------------------------------------------

-- Deterministic UUIDs for stable references
select set_config('seed.owner_user', '00000000-0000-0000-0000-000000000001', false);
select set_config('seed.manager_user', '00000000-0000-0000-0000-000000000002', false);
select set_config('seed.org', '10000000-0000-0000-0000-000000000001', false);

-- ------------------------------------------------------------------
-- Auth users (email confirmed)
-- ------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'owner@exportos.demo',
    crypt('Export@123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajesh Sharma"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'manager@exportos.demo',
    crypt('Export@123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Patel"}',
    now(), now()
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- Profiles
-- ------------------------------------------------------------------
insert into public.profiles (id, full_name, email, phone)
values
  ('00000000-0000-0000-0000-000000000001', 'Rajesh Sharma', 'owner@exportos.demo', '+91 98200 11223'),
  ('00000000-0000-0000-0000-000000000002', 'Priya Patel', 'manager@exportos.demo', '+91 98300 44556')
on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- Organization
-- ------------------------------------------------------------------
insert into public.organizations (
  id, name, slug, website_subdomain, status, plan_id, default_currency,
  trial_ends_at, billing_email
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Sharma Exports', 'sharma-exports', 'sharma-exports',
  'trial', (select id from public.plans where code = 'professional'), 'USD',
  now() + interval '30 days', 'owner@exportos.demo'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, title)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', 'Director'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'manager', 'Export Manager')
on conflict (organization_id, user_id) do nothing;

-- ------------------------------------------------------------------
-- Company profile
-- ------------------------------------------------------------------
insert into public.company_profiles (
  organization_id, company_name, gst_number, iec_number, pan_number,
  address_line1, city, state, country, pincode,
  contact_person, email, phone, whatsapp, website, year_established,
  certifications, export_markets, product_categories,
  social_links, tagline, about
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Sharma Exports', '27AABCD1234E1Z5', 'IEC1307001234', 'AABCD1234E',
  'Plot 42, MIDC Industrial Area', 'Mumbai', 'Maharashtra', 'India', '400070',
  'Rajesh Sharma', 'sales@sharmaexports.com', '+91 98200 11223', '+91 98200 11223', 'https://sharma-exports.exportos.com',
  2012,
  '["ISO 9001:2015", "APEDA Registered"]'::jsonb,
  '["United States", "United Arab Emirates", "Germany", "Australia"]'::jsonb,
  '["Spices", "Pulses", "Rice"]'::jsonb,
  '{"linkedin": "https://linkedin.com/company/sharma-exports"}'::jsonb,
  'Premium Indian spices and agricultural produce, exported worldwide.',
  'Sharma Exports is a trusted exporter of high-quality Indian spices, pulses and agricultural commodities. With over a decade of experience we serve importers across 20+ countries with consistent quality and timely delivery.'
)
on conflict (organization_id) do nothing;

-- ------------------------------------------------------------------
-- Product categories
-- ------------------------------------------------------------------
insert into public.product_categories (id, organization_id, name, slug, description)
values
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'Spices', 'spices', 'Whole and ground Indian spices'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'Rice', 'rice', 'Basmati and non-basmati rice'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'Pulses', 'pulses', 'Lentils and beans')
on conflict do nothing;

-- ------------------------------------------------------------------
-- Products
-- ------------------------------------------------------------------
insert into public.products (
  organization_id, category_id, name, slug, sku, hsn_code, description,
  technical_specifications, packaging_details, moq, lead_time,
  price, currency, unit, status, meta_title, meta_description, featured
)
select
  '10000000-0000-0000-0000-000000000001',
  c.id, 'Premium Indian Turmeric', 'premium-indian-turmeric', 'SPC-TRM-001', '0910',
  'High-curcumin Madras turmeric with bright yellow colour and strong aroma. Ideal for food, pharma and cosmetics industries.',
  '{"Curcumin": "min 3%", "Moisture": "max 10%", "Purity": "99%", "Packing": "25/50 kg PP bags"}'::jsonb,
  '25 kg / 50 kg PP bags, or as per buyer requirement', '1 Ton', '15 days',
  1200, 'USD', 'MT', 'published',
  'Buy Premium Indian Turmeric | Turmeric Exporters India', 'Export quality Madras turmeric with 3% curcumin, FDA-compliant, shipped worldwide from India.',
  true
from public.product_categories c
where c.organization_id = '10000000-0000-0000-0000-000000000001' and c.slug = 'spices'
on conflict do nothing;

insert into public.products (
  organization_id, category_id, name, slug, sku, hsn_code, description,
  technical_specifications, packaging_details, moq, lead_time,
  price, currency, unit, status, meta_title, meta_description, featured
)
select
  '10000000-0000-0000-0000-000000000001',
  c.id, '1121 Basmati Rice', '1121-basmati-rice', 'RCE-BAS-001', '1006',
  'Extra-long grain 1121 white basmati rice with superior aroma, aged for 18 months. Perfect for Middle East and European markets.',
  '{"Length": "8.35mm+", "Broken": "max 1%", "Moisture": "max 12.5%", "Packing": "5/10/25/50 kg"}'::jsonb,
  '5 kg / 25 kg / 50 kg non-woven bags with inner liner', '25 MT', '10 days',
  950, 'USD', 'MT', 'published',
  '1121 Basmati Rice Exporters | Premium Long Grain Rice', 'Premium aged 1121 basmati rice, export quality, available in custom packing for importers.',
  true
from public.product_categories c
where c.organization_id = '10000000-0000-0000-0000-000000000001' and c.slug = 'rice'
on conflict do nothing;

insert into public.products (
  organization_id, category_id, name, slug, sku, hsn_code, description,
  technical_specifications, packaging_details, moq, lead_time,
  price, currency, unit, status
)
select
  '10000000-0000-0000-0000-000000000001',
  c.id, 'Red Split Lentils (Masoor Dal)', 'red-split-lentils-masoor-dal', 'PLS-MSR-001', '0713',
  'Machine-cleaned red split lentils with uniform size and bright colour. Premium grade for global importers.',
  '{"Moisture": "max 13%", "Purity": "99.5%", "Size": "3-4mm", "Packing": "25/50 kg"}'::jsonb,
  '25 kg / 50 kg PP bags', '10 MT', '12 days',
  720, 'USD', 'MT', 'published'
from public.product_categories c
where c.organization_id = '10000000-0000-0000-0000-000000000001' and c.slug = 'pulses'
on conflict do nothing;

-- Product media
insert into public.product_media (organization_id, product_id, type, url, alt_text, sort_order)
select
  '10000000-0000-0000-0000-000000000001', p.id, 'image',
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800', 'Turmeric powder', 0
from public.products p
where p.organization_id = '10000000-0000-0000-0000-000000000001' and p.slug = 'premium-indian-turmeric'
on conflict do nothing;

-- ------------------------------------------------------------------
-- Buyers
-- ------------------------------------------------------------------
insert into public.buyers (
  organization_id, company_name, contact_person, email, phone, website,
  country, city, products_interested, notes, tags, last_contacted_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'Gulf Spice Trading LLC', 'Ahmed Al Farsi', 'ahmed@gulfspice.ae', '+971 50 123 4567', 'https://gulfspice.ae',
   'United Arab Emirates', 'Dubai', '["Spices", "Rice"]', 'Interested in 5 containers of turmeric per quarter.', '{uae,spices,repeat}', now() - interval '10 days'),
  ('10000000-0000-0000-0000-000000000001', 'Nordic Foods GmbH', 'Anna Weber', 'anna@nordicfoods.de', '+49 151 2345 6789', 'https://nordicfoods.de',
   'Germany', 'Hamburg', '["Basmati Rice"]', 'Quality-focused buyer. Requires ISO certification.', '{germany,rice,iso}', now() - interval '25 days')
on conflict do nothing;

-- ------------------------------------------------------------------
-- Leads
-- ------------------------------------------------------------------
insert into public.leads (
  organization_id, company_name, buyer_name, email, phone, country,
  product_interested, lead_value, currency, source, priority, status,
  assigned_to, notes, created_by, created_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'Mediterranean Foods SARL', 'Yusuf Karim', 'yusuf@medfoods.fr', '+33 6 12 34 56 78', 'France',
   'Turmeric', 15000, 'USD', 'website', 'high', 'quotation_sent',
   '00000000-0000-0000-0000-000000000002', 'Sent quotation Q-2026-0001 on the 15th.', '00000000-0000-0000-0000-000000000002', now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000001', 'Sunrise Imports Pty Ltd', 'Michael Chen', 'michael@sunriseimports.com.au', '+61 4 1234 5678', 'Australia',
   'Basmati Rice', 28000, 'USD', 'indiamart', 'medium', 'new',
   '00000000-0000-0000-0000-000000000002', 'Follow up next week.', '00000000-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000001', 'American Spice Co.', 'Robert Johnson', 'rob@americanspice.com', '+1 212 555 0147', 'United States',
   'Turmeric', 22000, 'USD', 'alibaba', 'urgent', 'negotiation',
   '00000000-0000-0000-0000-000000000001', 'Negotiating on freight charges.', '00000000-0000-0000-0000-000000000001', now() - interval '4 days')
on conflict do nothing;

-- ------------------------------------------------------------------
-- Quotation
-- ------------------------------------------------------------------
insert into public.quotations (
  organization_id, quotation_number, lead_id, buyer_id, buyer_name, buyer_company,
  buyer_email, buyer_country, currency, incoterm, payment_terms, validity_days,
  subtotal, freight, insurance, tax, tax_rate, total, status, sent_at, expires_at,
  created_by, created_at
)
select
  '10000000-0000-0000-0000-000000000001', 'Q-2026-0001', l.id,
  (select id from public.buyers b where b.organization_id = '10000000-0000-0000-0000-000000000001' limit 1),
  l.buyer_name, l.company_name, l.email, l.country,
  'USD', 'CIF', '50% advance, 50% against copy of shipping documents', 30,
  15000, 1200, 350, 0, 0, 16550, 'sent', now() - interval '5 days', now() + interval '25 days',
  '00000000-0000-0000-0000-000000000002', now() - interval '6 days'
from public.leads l
where l.organization_id = '10000000-0000-0000-0000-000000000001' and l.status = 'quotation_sent'
on conflict do nothing;

insert into public.quotation_items (organization_id, quotation_id, product_id, description, hsn_code, quantity, unit, unit_price, amount)
select
  q.organization_id, q.id, p.id, p.name, p.hsn_code, 12.5, 'MT', 1200, 15000
from public.quotations q
cross join public.products p
where q.organization_id = '10000000-0000-0000-0000-000000000001'
  and q.quotation_number = 'Q-2026-0001'
  and p.slug = 'premium-indian-turmeric'
on conflict do nothing;

-- ------------------------------------------------------------------
-- Invoice
-- ------------------------------------------------------------------
insert into public.invoices (
  organization_id, invoice_number, quotation_id, buyer_name, buyer_company,
  buyer_email, buyer_country, invoice_date, due_date, currency, payment_terms,
  subtotal, freight, shipping_charges, tax, total, status,
  created_by, created_at
)
select
  q.organization_id, 'INV-2026-0001', q.id, q.buyer_name, q.buyer_company,
  q.buyer_email, q.buyer_country, current_date, current_date + interval '30 days',
  q.currency, q.payment_terms, q.subtotal, q.freight, 0, 0, q.total, 'sent',
  '00000000-0000-0000-0000-000000000002', now()
from public.quotations q
where q.organization_id = '10000000-0000-0000-0000-000000000001'
  and q.quotation_number = 'Q-2026-0001'
on conflict do nothing;

insert into public.invoice_items (organization_id, invoice_id, product_id, description, hsn_code, quantity, unit, unit_price, amount)
select
  i.organization_id, i.id, qi.product_id, qi.description, qi.hsn_code, qi.quantity, qi.unit, qi.unit_price, qi.amount
from public.invoices i
join public.quotation_items qi on qi.quotation_id = i.quotation_id
where i.organization_id = '10000000-0000-0000-0000-000000000001'
  and i.invoice_number = 'INV-2026-0001'
on conflict do nothing;

-- ------------------------------------------------------------------
-- Website settings + pages
-- ------------------------------------------------------------------
insert into public.website_settings (
  organization_id, theme, is_published, primary_color, accent_color,
  hero_heading, hero_subheading, contact_email, contact_phone, whatsapp_number
)
values (
  '10000000-0000-0000-0000-000000000001', 'modern', true,
  '#14532d', '#16a34a',
  'Premium Indian Spices, Rice & Pulses, Exported Worldwide',
  'ISO-certified exporter serving importers across 20+ countries with consistent quality and on-time delivery.',
  'sales@sharmaexports.com', '+91 98200 11223', '+91 98200 11223'
)
on conflict (organization_id) do nothing;

insert into public.website_pages (organization_id, slug, title, is_home, is_published, sort_order, content)
values
  ('10000000-0000-0000-0000-000000000001', 'home', 'Home', true, true, 0, '{"sections": ["hero", "products", "about", "contact"]}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', 'about', 'About Us', false, true, 1, '{}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', 'products', 'Our Products', false, true, 2, '{}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', 'blog', 'Blog', false, true, 3, '{}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', 'contact', 'Contact Us', false, true, 4, '{}'::jsonb)
on conflict (organization_id, slug) do nothing;

-- ------------------------------------------------------------------
-- Blog posts
-- ------------------------------------------------------------------
insert into public.blog_posts (
  organization_id, title, slug, excerpt, content, keyword, target_country,
  target_product, seo_title, meta_description, faqs, schema_json,
  author_id, status, published_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  'A Complete Guide to Importing Indian Spices in 2026',
  'guide-importing-indian-spices-2026',
  'Everything importers need to know about sourcing turmeric, chilli and other spices from India - quality, HS codes, certifications and shipping.',
  'Indian spices are among the worlds most traded commodities. This guide covers sourcing, quality checks, required certifications and Incoterms for importing spices from India to the USA, Europe and the Middle East.',
  'indian spices import guide', 'United States', 'Spices',
  'Indian Spices Import Guide 2026 | HS Codes, Quality, Shipping',
  'A practical guide for importing Indian spices: HS codes, quality parameters, certifications, FOB vs CIF, and finding reliable exporters.',
  '[{"q": "What HS code applies to turmeric?", "a": "Turmeric (whole or ground) falls under HS code 0910."}]'::jsonb,
  '{"@type": "Article"}'::jsonb,
  '00000000-0000-0000-0000-000000000001', 'published', now() - interval '3 days'
)
on conflict (organization_id, slug) do nothing;

-- ------------------------------------------------------------------
-- AI conversation sample
-- ------------------------------------------------------------------
insert into public.ai_conversations (id, organization_id, user_id, title, created_at, updated_at)
values (
  gen_random_uuid(), '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001', 'HS code for packaged turmeric',
  now() - interval '1 day', now() - interval '1 day'
);

-- ------------------------------------------------------------------
-- Subscription (trial)
-- ------------------------------------------------------------------
insert into public.subscriptions (
  organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at, seats
)
values (
  '10000000-0000-0000-0000-000000000001',
  (select id from public.plans where code = 'professional'),
  'trialing', 'annual', now(), now() + interval '365 days', now() + interval '30 days', 2
)
on conflict do nothing;
