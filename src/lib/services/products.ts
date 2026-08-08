import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify, camelToSnakeObject } from '@/lib/utils';

export interface ListOptions {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  categoryId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

const PRODUCT_SELECT =
  '*, category:product_categories(id, name, slug), variants:product_variants(*), media:product_media(*), created_by:profiles(full_name, email)';

export async function listProducts(supabase: SupabaseClient, organizationId: string, opts: ListOptions) {
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order(opts.sortBy ?? 'created_at', { ascending: opts.sortDir === 'asc' });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.categoryId) query = query.eq('category_id', opts.categoryId);
  if (opts.q) query = query.ilike('name', `%${opts.q}%`);

  const { from, to } = pageRange(opts.page, opts.pageSize);
  const { data, count } = await query.range(from, to);

  return { items: data ?? [], count: count ?? 0 };
}

export async function getProduct(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createProduct(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  payload: Record<string, unknown> & { variants?: unknown[]; media?: unknown[] }
) {
  const { variants = [], media = [], ...fields } = payload;

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      ...camelToSnakeObject(fields),
      organization_id: organizationId,
      created_by: userId,
      slug: await uniqueSlug(supabase, organizationId, String(fields.name))
    })
    .select()
    .single();

  if (productError || !product) return { data: null, error: productError };

  await insertVariantsAndMedia(supabase, organizationId, product.id, variants, media);
  return { data: product, error: null };
}

export async function updateProduct(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  payload: Record<string, unknown> & { variants?: unknown[]; media?: unknown[] }
) {
  const { variants, media, ...fields } = payload;

  const { data, error } = await supabase
    .from('products')
    .update(camelToSnakeObject(fields))
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  if (variants) {
    await supabase.from('product_variants').delete().eq('organization_id', organizationId).eq('product_id', id);
    await insertVariantsAndMedia(supabase, organizationId, id, variants, media ?? []);
  }

  return { data, error };
}

export async function deleteProduct(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

async function insertVariantsAndMedia(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  variants: unknown[],
  media: unknown[]
) {
  if (variants.length > 0) {
    await supabase.from('product_variants').insert(
      (variants as Array<Record<string, unknown>>).map((v) => ({
        ...camelToSnakeObject(v),
        organization_id: organizationId,
        product_id: productId
      }))
    );
  }
  if (media.length > 0) {
    await supabase.from('product_media').insert(
      (media as Array<Record<string, unknown>>).map((m, i) => ({
        type: (m.type as string) ?? 'image',
        url: m.url as string,
        alt_text: m.altText,
        sort_order: i,
        organization_id: organizationId,
        product_id: productId
      }))
    );
  }
}

async function uniqueSlug(supabase: SupabaseClient, organizationId: string, name: string): Promise<string> {
  const base = slugify(name) || 'product';
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .ilike('slug', `${base}%`);
  return count && count > 0 ? `${base}-${(count ?? 1) + 1}` : base;
}

export async function listCategories(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('product_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  return data ?? [];
}

export async function createCategory(supabase: SupabaseClient, organizationId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({ ...camelToSnakeObject(payload), organization_id: organizationId, slug: slugify(String(payload.name)) })
    .select()
    .single();
  return { data, error };
}

export async function deleteCategory(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

function pageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
