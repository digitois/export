import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Email click-tracking redirect. Public endpoint used inside campaign emails.
 */
export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string; contactId: string }> }) {
  try {
    const { campaignId, contactId } = await params;
    const url = new URL(request.url).searchParams.get('url');

    const supabase = await createClient();
    await supabase.rpc('track_email_event', {
        p_campaign_id: campaignId,
        p_contact_id: contactId,
        p_event: 'clicked',
        p_url: url
      });

    if (url && /^https?:\/\//i.test(url)) {
      return NextResponse.redirect(url);
    }
  } catch {
    // fall through
  }

  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
