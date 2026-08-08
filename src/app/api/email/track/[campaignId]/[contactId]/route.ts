import { createClient } from '@/lib/supabase/server';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Email open-tracking pixel. Public endpoint used inside campaign emails.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string; contactId: string }> }) {
  try {
    const { campaignId, contactId } = await params;
    const supabase = await createClient();
    await supabase.rpc('track_email_event', {
        p_campaign_id: campaignId,
        p_contact_id: contactId,
        p_event: 'opened'
      });
  } catch {
    // tracking must never break the email render
  }

  return new Response(TRANSPARENT_PNG, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(TRANSPARENT_PNG.length),
      'Cache-Control': 'no-store'
    }
  });
}
