import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createDripCampaign, listDripCampaigns } from '@/lib/services/advanced-automation';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active_only') === 'true';

  const { data, error } = await listDripCampaigns(auth.supabase, auth.organizationId, activeOnly);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  const { data, error } = await createDripCampaign(
    auth.supabase,
    auth.organizationId,
    auth.user.id,
    body
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}