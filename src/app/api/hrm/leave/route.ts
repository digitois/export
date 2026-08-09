import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { leaveRequestSchema } from '@/lib/validations';
import { listLeaveRequests, createLeaveRequest } from '@/lib/services/hrm';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const { items } = await listLeaveRequests(ctx.supabase, ctx.organizationId, status);
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = leaveRequestSchema.parse(body);

    const { data, error } = await createLeaveRequest(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_leave_request',
      entityType: 'leave_request',
      entityId: data?.id,
      meta: { employeeId: parsed.employeeId, type: parsed.leaveType },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
