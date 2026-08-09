-- ------------------------------------------------------------------
-- Export OS - 00027: Website Builder — block-based page sections
--
-- Adds a `blocks` jsonb column to website_settings holding an ordered
-- array of draggable section blocks. Each block: { id, type, props }.
-- Block types are rendered by src/components/site/blocks/* in the public
-- renderer and edited via the drag-and-drop builder at /app/website.
-- When blocks is empty the legacy section-toggles renderer is used so
-- existing sites are unaffected.
-- ------------------------------------------------------------------

alter table public.website_settings add column if not exists blocks jsonb not null default '[]'::jsonb;

-- Recreate the public_sites view so the tenant renderer can read blocks.
drop view if exists public.public_sites;
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
  ws.hero_eyebrow,
  ws.cta_label,
  ws.enable_product_section,
  ws.enable_about_section,
  ws.enable_blog_section,
  ws.hero_image_url,
  ws.announcement_bar,
  ws.show_inquiry_form,
  ws.contact_email,
  ws.contact_phone,
  ws.whatsapp_number,
  ws.custom_domain,
  ws.custom_footer,
  ws.blocks,
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
