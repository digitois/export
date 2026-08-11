import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { assignVariant, trackABTestMetric, calculateABTestWinner } from '@/lib/services/advanced-automation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { action } = body;

  if (action === 'assign_variant') {
    const { variantId, error } = await assignVariant(
      auth.supabase,
      params.id,
      body.contact_id
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data: { variant_id: variantId } });
  }

  if (action === 'track_metric') {
    const { data, error } = await trackABTestMetric(
      auth.supabase,
      params.id,
      body.variant_id,
      body.contact_id,
      body.metric_type,
      body.value
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  if (action === 'calculate_winner') {
    const { winningVariantId, statisticalSignificance } = await calculateABTestWinner(
      auth.supabase,
      params.id
    );

    return NextResponse.json({ 
      data: { 
        winning_variant_id: winningVariantId, 
        statistical_significance: statisticalSignificance 
      } 
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}