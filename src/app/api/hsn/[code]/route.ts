import { NextRequest } from 'next/server';
import { createSiteClient } from '@/lib/supabase/site';
import { getHsnCode } from '@/lib/services/hsn';

export const dynamic = 'force-dynamic';

/** GET /api/hsn/{code} — exact code lookup (public). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSiteClient();
  const result = await getHsnCode(supabase, code);
  if (!result) {
    return Response.json({ error: 'HSN code not found' }, { status: 404 });
  }
  return Response.json({ data: result });
}