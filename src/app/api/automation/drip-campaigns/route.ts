import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';
import { createDripCampaign, listDripCampaigns } from '@/lib/services/advanced-automation';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    const { data, error } = await listDripCampaigns(ctx.supabase, ctx.organizationId, activeOnly);
    
    if (error) {
      return ok({ error: error.message }, { status: 400 });
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const { data, error } = await createDripCampaign(
      ctx.supabase,
      ctx.organizationId,
      ctx.userId,
      body
    );

    if (error) {
      return ok({ error: error.message }, { status: 400 });
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}