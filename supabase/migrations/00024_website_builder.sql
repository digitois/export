-- ------------------------------------------------------------------
-- Export OS - 00024: Website Builder — theme presets
--
-- Extends the website_theme enum to 8 ready-made designs used by the
-- tenant website builder. The renderer maps each value to a full preset
-- (fonts, radii, palette accents, layout style) defined in
-- src/lib/site/themes.ts.
-- ------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'website_theme' and e.enumlabel = 'editorial') then
    alter type public.website_theme add value 'editorial';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'website_theme' and e.enumlabel = 'coastal') then
    alter type public.website_theme add value 'coastal';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'website_theme' and e.enumlabel = 'sunset') then
    alter type public.website_theme add value 'sunset';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'website_theme' and e.enumlabel = 'forest') then
    alter type public.website_theme add value 'forest';
  end if;
end $$;

-- Add preference for the public inquiry form heading + CTA label so
-- tenants can customize their lead magnet without code.
alter table public.website_settings add column if not exists hero_eyebrow text;
alter table public.website_settings add column if not exists cta_label text not null default 'Request a Quote';
alter table public.website_settings add column if not exists enable_product_section boolean not null default true;
alter table public.website_settings add column if not exists enable_about_section boolean not null default true;
alter table public.website_settings add column if not exists enable_blog_section boolean not null default true;

-- Expose the new settings (and section toggles) on the public site view
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

-- Re-grant public read access (drop/recreate above resets the grant).
grant select on public.public_sites to anon, authenticated;