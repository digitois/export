import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { followUpSchema, paginationSchema } from '@/lib/validations';
import { listFollowUps, createFollowUp } from '@/lib/services/follow-ups';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listFollowUps(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      leadId: params.leadId,
      done: params.done === 'true' ? true : params.done === 'false' ? false : undefined,
      upcoming: params.upcoming === 'true'
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
    const parsed = followUpSchema.parse(body);

    const { data, error } = await createFollowUp(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_follow_up',
      entityType: 'follow_up',
      entityId: data?.id,
      meta: { leadId: parsed.leadId, scheduledAt: parsed.scheduledAt },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}