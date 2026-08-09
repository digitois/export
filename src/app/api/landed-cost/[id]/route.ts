import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getLandedCostEstimate, deleteLandedCostEstimate } from '@/lib/services/landed-cost-estimates';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getLandedCostEstimate(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Estimate not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteLandedCostEstimate(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
