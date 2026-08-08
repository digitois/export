import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getLeadFunnel, getMonthlyTrend, getWebsiteVisitors } from '@/lib/services/analytics';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const type = params.type ?? 'overview';
    const months = Math.min(12, Math.max(1, Number(params.months ?? 6)));

    let result: unknown;
    switch (type) {
      case 'funnel': {
        result = { funnel: await getLeadFunnel(ctx.supabase, ctx.organizationId) };
        break;
      }
      case 'trends': {
        const [leads, quotations, invoices] = await Promise.all([
          getMonthlyTrend(ctx.supabase, ctx.organizationId, 'leads', months),
          getMonthlyTrend(ctx.supabase, ctx.organizationId, 'quotations', months),
          getMonthlyTrend(ctx.supabase, ctx.organizationId, 'invoices', months)
        ]);
        result = { leads, quotations, invoices };
        break;
      }
      case 'visitors': {
        result = await getWebsiteVisitors(ctx.supabase, ctx.organizationId, months * 30);
        break;
      }
      default: {
        const [stats, funnel, trends, visitors] = await Promise.all([
          (await import('@/lib/services/analytics')).getDashboardStats(ctx.supabase, ctx.organizationId),
          getLeadFunnel(ctx.supabase, ctx.organizationId),
          (async () => {
            const [leads, invoices] = await Promise.all([
              getMonthlyTrend(ctx.supabase, ctx.organizationId, 'leads', months),
              getMonthlyTrend(ctx.supabase, ctx.organizationId, 'invoices', months)
            ]);
            return { leads, invoices };
          })(),
          getWebsiteVisitors(ctx.supabase, ctx.organizationId, 30)
        ]);
        result = { stats, funnel, trends, visitors };
      }
    }

    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
