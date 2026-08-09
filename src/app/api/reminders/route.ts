import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { reminderSchema, paginationSchema } from '@/lib/validations';
import { listReminders, createReminder } from '@/lib/services/reminders';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listReminders(ctx.supabase, ctx.userId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      unreadOnly: params.unreadOnly === 'true',
      upcomingOnly: params.upcomingOnly === 'true'
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
    const parsed = reminderSchema.parse(body);

    const { data, error } = await createReminder(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_reminder',
      entityType: 'reminder',
      entityId: data?.id,
      meta: { leadId: parsed.leadId, followUpId: parsed.followUpId },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}