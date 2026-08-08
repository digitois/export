import { NextRequest } from 'next/server';
import { createSiteClient } from '@/lib/supabase/site';
import { searchHsnCodes } from '@/lib/services/hsn';

export const dynamic = 'force-dynamic';

/**
 * Free HSN/SAC search API for exporters.
 * Public by design: no auth required, supports code or product-name search.
 *
 * GET /api/hsn/search?q=turmeric&limit=10
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const rawType = request.nextUrl.searchParams.get('type');
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 100);

  if (!q) {
    return Response.json({ data: [] });
  }

  const supabase = createSiteClient();
  const results = await searchHsnCodes(supabase, q, {
    limit,
    codeType: rawType === 'hsn' || rawType === 'sac' ? rawType : undefined
  });

  return Response.json({ data: results });
}