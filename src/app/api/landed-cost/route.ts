import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { landedCostSchema, paginationSchema } from '@/lib/validations';
import { listLandedCostEstimates, createLandedCostEstimate } from '@/lib/services/landed-cost-estimates';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listLandedCostEstimates(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = landedCostSchema.parse(body);

    const { data, error, result } = await createLandedCostEstimate(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_landed_cost_estimate',
      entityType: 'landed_cost_estimate',
      entityId: data?.id,
      meta: { name: parsed.name, incoterm: parsed.incoterm },
      ip: getIp(request)
    });

    return ok({ ...data, result });
  } catch (err) {
    return handleApiError(err);
  }
}
