import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createSegmentationRule } from '@/lib/services/advanced-automation';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  const { data, error } = await createSegmentationRule(
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