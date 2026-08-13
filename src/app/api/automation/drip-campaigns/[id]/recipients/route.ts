import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';
import { addContactToDripCampaign, processDripCampaignStep } from '@/lib/services/advanced-automation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { action, contact_id, lead_id } = body;

    if (action === 'add_contact') {
      const { data, error } = await addContactToDripCampaign(
        ctx.supabase,
        id,
        contact_id,
        lead_id
      );

      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data });
    }

    if (action === 'process_step') {
      const { data, error } = await processDripCampaignStep(
        ctx.supabase,
        ctx.organizationId,
        body.recipient_id
      );

      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data });
    }

    return ok({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}