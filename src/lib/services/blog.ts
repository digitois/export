import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify, camelToSnakeObject } from '@/lib/utils';

export async function listBlogPosts(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; status?: string;
}) {
  let query = supabase
    .from('blog_posts')
    .select('*, author_id:profiles(full_name, email)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.q) query = query.ilike('title', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getBlogPost(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, author_id:profiles(full_name, email)')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createBlogPost(supabase: SupabaseClient, organizationId: string, authorId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...camelToSnakeObject(payload),
      organization_id: organizationId,
      author_id: authorId,
      slug: slugify(String(payload.title))
    })
    .select()
    .single();
  return { data, error };
}

export async function updateBlogPost(supabase: SupabaseClient, organizationId: string, id: string, payload: Record<string, unknown>) {
  const updatePayload: Record<string, unknown> = { ...camelToSnakeObject(payload) };
  if (payload.title) updatePayload.slug = slugify(String(payload.title));
  if (payload.status === 'published' && !updatePayload.published_at) {
    updatePayload.published_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updatePayload)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteBlogPost(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

export async function trackBlogView(supabase: SupabaseClient, organizationId: string, postId: string, meta?: {
  country?: string | null; referrer?: string | null;
}) {
  await supabase.from('blog_post_views').insert({
    organization_id: organizationId,
    blog_post_id: postId,
    country: meta?.country,
    referrer: meta?.referrer
  });
  await supabase.rpc('increment_blog_views', { p_org_id: organizationId, p_post_id: postId });
}
