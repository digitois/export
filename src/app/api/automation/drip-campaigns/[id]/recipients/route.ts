import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { addContactToDripCampaign, processDripCampaignStep } from '@/lib/services/advanced-automation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { action, contact_id, lead_id } = body;

  if (action === 'add_contact') {
    const { data, error } = await addContactToDripCampaign(
      params.id,
      contact_id,
      lead_id
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  if (action === 'process_step') {
    const { data, error } = await processDripCampaignStep(
      auth.supabase,
      auth.organizationId,
      body.recipient_id
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}