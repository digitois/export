import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject, snakeToCamelObject } from '@/lib/utils';

export async function getWebsiteSettings(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('website_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const normalized = data ? snakeToCamelObject(data as Record<string, unknown>) : null;
  return { data: normalized, error };
}

export async function upsertWebsiteSettings(supabase: SupabaseClient, organizationId: string, payload: Record<string, unknown>) {
  const body = camelToSnakeObject(payload);
  const { data, error } = await supabase
    .from('website_settings')
    .upsert({ organization_id: organizationId, ...body }, { onConflict: 'organization_id' })
    .select()
    .single();
  return { data, error };
}

export async function setWebsitePublished(supabase: SupabaseClient, organizationId: string, isPublished: boolean) {
  const { data, error } = await supabase
    .from('website_settings')
    .update({ is_published: isPublished })
    .eq('organization_id', organizationId)
    .select()
    .single();
  return { data, error };
}

export async function listWebsitePages(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('website_pages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order');
  return data ?? [];
}

export async function upsertWebsitePage(supabase: SupabaseClient, organizationId: string, payload: {
  id?: string; slug: string; title: string; content?: Record<string, unknown>; isHome?: boolean;
}) {
  const body = {
    organization_id: organizationId,
    slug: payload.slug,
    title: payload.title,
    content: payload.content ?? {},
    is_home: payload.isHome ?? false
  };
  if (payload.id) {
    const { data, error } = await supabase
      .from('website_pages')
      .update({ slug: body.slug, title: body.title, content: body.content, is_home: body.is_home })
      .eq('id', payload.id)
      .eq('organization_id', organizationId)
      .select()
      .single();
    return { data, error };
  }
  const { data, error } = await supabase
    .from('website_pages')
    .insert(body)
    .select()
    .single();
  return { data, error };
}

export async function deleteWebsitePage(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('website_pages')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

export async function trackVisit(supabase: SupabaseClient, organizationId: string, visit: {
  path: string; country?: string | null; referrer?: string | null; userAgent?: string | null;
}) {
  const ua = visit.userAgent ?? '';
  let device = 'desktop';
  if (/mobile|android|iphone/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'tablet';

  await supabase.from('website_visits').insert({
    organization_id: organizationId,
    path: visit.path,
    country: visit.country,
    referrer: visit.referrer,
    user_agent: ua.slice(0, 500),
    device
  });
}

/**
 * Resolve an organization by its public site slug OR its custom domain.
 * Used by the public website router.
 */
export async function resolveSite(supabase: SupabaseClient, identifier: string) {
  const { data } = await supabase
    .from('public_sites')
    .select('*')
    .or(`website_subdomain.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();
  return data ?? null;
}
