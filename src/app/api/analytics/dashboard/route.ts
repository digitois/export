import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getDashboardStats, getLeadFunnel, getMonthlyTrend, getWebsiteVisitors } from '@/lib/services/analytics';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const stats = await getDashboardStats(ctx.supabase, ctx.organizationId);
    return ok(stats);
  } catch (err) {
    return handleApiError(err);
  }
}
