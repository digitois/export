import type { SupabaseClient } from '@supabase/supabase-js';

export interface HsnCode {
  code: string;
  description: string;
  code_type: 'hsn' | 'sac';
  chapter: string | null;
}

export async function searchHsnCodes(
  supabase: SupabaseClient,
  rawQuery: string,
  opts: { limit?: number; codeType?: 'hsn' | 'sac' } = {}
): Promise<HsnCode[]> {
  const q = rawQuery.trim();
  if (!q) return [];

  const limit = Math.min(opts.limit ?? 20, 100);

  const { data: viaRpc } = await supabase.rpc('search_hsn', {
    p_query: q,
    p_limit: limit
  });

  if (viaRpc && viaRpc.length > 0) {
    let rows = viaRpc as Array<HsnCode & { rank: number }>;
    if (opts.codeType) rows = rows.filter((r) => r.code_type === opts.codeType);
    return rows.slice(0, limit).map(({ rank: _rank, ...rest }) => rest);
  }

  // Fallback: direct ILIKE search
  let builder = supabase
    .from('hsn_codes')
    .select('code, description, code_type, chapter')
    .or(`code.ilike.%${q}%,description.ilike.%${q}%`)
    .order('code')
    .limit(limit);

  if (opts.codeType) builder = builder.eq('code_type', opts.codeType);

  const { data } = await builder;
  return (data as HsnCode[] | null) ?? [];
}

export async function getHsnCode(supabase: SupabaseClient, code: string): Promise<HsnCode | null> {
  const { data } = await supabase
    .from('hsn_codes')
    .select('code, description, code_type, chapter')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  return (data as HsnCode | null) ?? null;
}

export async function getHsnByChapter(supabase: SupabaseClient, chapter: string, limit = 100): Promise<HsnCode[]> {
  const { data } = await supabase
    .from('hsn_codes')
    .select('code, description, code_type, chapter')
    .eq('chapter', chapter)
    .order('code')
    .limit(limit);
  return (data as HsnCode[] | null) ?? [];
}