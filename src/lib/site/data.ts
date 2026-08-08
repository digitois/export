import { cache } from 'react';
import 'server-only';
import { createSiteClient } from '@/lib/supabase/site';

export interface PublicSite {
  organization_id: string;
  company_name: string;
  logo_url: string | null;
  website_subdomain: string | null;
  slug: string;
  default_currency: string;
  theme: string;
  primary_color: string | null;
  accent_color: string | null;
  hero_heading: string | null;
  hero_subheading: string | null;
  hero_image_url: string | null;
  announcement_bar: string | null;
  show_inquiry_form: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  custom_domain: string | null;
  custom_footer: string | null;
  about: string | null;
  tagline: string | null;
  export_markets: string[] | null;
  product_categories: string[] | null;
  certifications: string[] | null;
  social_links: Record<string, string> | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  iec_number: string | null;
  website: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

export const getSite = cache(async (identifier: string): Promise<PublicSite | null> => {
  const supabase = createSiteClient();

  const { data } = await supabase
    .from('public_sites')
    .select('*')
    .or(`website_subdomain.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!data) return null;
  return data as unknown as PublicSite;
});

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technical_specifications: Record<string, string>;
  packaging_details: string | null;
  moq: string | null;
  lead_time: string | null;
  price: number | null;
  currency: string;
  unit: string | null;
  featured: boolean;
  hsn_code: string | null;
  category_id: string | null;
  category: { id: string; name: string; slug: string } | null;
  media: { id: string; url: string; alt_text: string | null }[];
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technical_specifications: unknown;
  packaging_details: string | null;
  moq: string | null;
  lead_time: string | null;
  price: number | null;
  currency: string;
  unit: string | null;
  featured: boolean;
  hsn_code: string | null;
  category_id: string | null;
  product_categories: { id: string; name: string; slug: string }[] | null;
  product_media: { id: string; url: string; alt_text: string | null }[] | null;
}

export async function getPublicProducts(orgId: string): Promise<PublicProduct[]> {
  const supabase = createSiteClient();

  const { data } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, technical_specifications, packaging_details, moq, lead_time, price, currency, unit, featured, hsn_code, category_id, product_categories(id, name, slug), product_media(id, url, alt_text)'
    )
    .eq('organization_id', orgId)
    .eq('status', 'published')
    .order('featured', { ascending: false });

  return (data as unknown as ProductRow[] | null ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    technical_specifications: (row.technical_specifications ?? {}) as Record<string, string>,
    packaging_details: row.packaging_details,
    moq: row.moq,
    lead_time: row.lead_time,
    price: row.price,
    currency: row.currency,
    unit: row.unit,
    featured: row.featured,
    hsn_code: row.hsn_code,
    category_id: row.category_id,
    category: Array.isArray(row.product_categories) ? row.product_categories[0] ?? null : null,
    media: row.product_media ?? []
  }));
}

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  published_at: string | null;
}

export async function getPublicBlogPosts(orgId: string): Promise<PublicBlogPost[]> {
  const supabase = createSiteClient();

  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, content, cover_image_url, published_at')
    .eq('organization_id', orgId)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });

  return (data as unknown as PublicBlogPost[] | null ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at
  }));
}

export async function getPublicBlogPost(orgId: string, slug: string): Promise<PublicBlogPost | null> {
  const supabase = createSiteClient();

  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, content, cover_image_url, published_at')
    .eq('organization_id', orgId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as PublicBlogPost;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at
  };
}