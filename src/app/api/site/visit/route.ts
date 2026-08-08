import { createSiteClient } from '@/lib/supabase/site';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organization_id, path, referrer, user_agent } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'Organization required.' }, { status: 400 });
    }

    const ua = typeof user_agent === 'string' ? user_agent : '';
    let device = 'desktop';
    if (/mobile|android|iphone/i.test(ua)) device = 'mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'tablet';

    const supabase = createSiteClient();
    await supabase.from('website_visits').insert({
      organization_id,
      path: path || '/',
      referrer: referrer || null,
      user_agent: ua.slice(0, 500),
      device
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}