import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getFinanceSummary } from '@/lib/services/finance';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = new URL(request.url).searchParams;
    const months = Number(params.get('months') ?? 6);
    const summary = await getFinanceSummary(ctx.supabase, ctx.organizationId, months);
    return ok(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
