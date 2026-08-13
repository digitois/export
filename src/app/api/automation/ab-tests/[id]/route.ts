import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';
import { assignVariant, trackABTestMetric, calculateABTestWinner } from '@/lib/services/advanced-automation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'assign_variant') {
      const { variantId, error } = await assignVariant(
        ctx.supabase,
        id,
        body.contact_id
      );

      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data: { variant_id: variantId } });
    }

    if (action === 'track_metric') {
      const { data, error } = await trackABTestMetric(
        ctx.supabase,
        id,
        body.variant_id,
        body.contact_id,
        body.metric_type,
        body.value
      );

      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data });
    }

    if (action === 'calculate_winner') {
      const { winningVariantId, statisticalSignificance } = await calculateABTestWinner(
        ctx.supabase,
        id
      );

      return ok({ 
        data: { 
          winning_variant_id: winningVariantId, 
          statistical_significance: statisticalSignificance 
        } 
      });
    }

    return ok({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}