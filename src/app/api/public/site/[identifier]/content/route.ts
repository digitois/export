import { createClient } from '@/lib/supabase/server';
import { resolveSite } from '@/lib/services/website';

export async function GET(_request: Request, { params }: { params: Promise<{ identifier: string }> }) {
  try {
    const supabase = await createClient();
    const { identifier } = await params;
    const site = await resolveSite(supabase, identifier);
    if (!site) return Response.json({ error: 'Site not found' }, { status: 404 });

    const orgId = site.organization_id as string;

    const [products, categories, pages, blogPosts] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, slug, hsn_code, description, price, currency, unit, moq, lead_time, meta_title, meta_description, media:product_media(*)')
        .eq('organization_id', orgId)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      supabase
        .from('product_categories')
        .select('id, name, slug')
        .eq('organization_id', orgId),
      supabase
        .from('website_pages')
        .select('slug, title, is_home, sort_order')
        .eq('organization_id', orgId)
        .eq('is_published', true)
        .order('sort_order'),
      supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, published_at, keyword, target_country')
        .eq('organization_id', orgId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10)
    ]);

    return Response.json({
      data: {
        products: products.data ?? [],
        categories: categories.data ?? [],
        pages: pages.data ?? [],
        blogPosts: blogPosts.data ?? []
      }
    });
  } catch {
    return Response.json({ error: 'Site not found' }, { status: 404 });
  }
}
