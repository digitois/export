import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getLeadStats } from '@/lib/services/leads';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const stats = await getLeadStats(ctx.supabase, ctx.organizationId);
    return ok(stats);
  } catch (err) {
    return handleApiError(err);
  }
}
