import { createClient } from '@/lib/supabase/server';
import { resolveSite } from '@/lib/services/website';

export async function GET(_request: Request, { params }: { params: Promise<{ identifier: string }> }) {
  try {
    const supabase = await createClient();
    const { identifier } = await params;
    const site = await resolveSite(supabase, identifier);

    if (!site) return Response.json({ error: 'Site not found' }, { status: 404 });

    return Response.json({ data: site });
  } catch {
    return Response.json({ error: 'Site not found' }, { status: 404 });
  }
}
