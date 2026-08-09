import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { leaveReviewSchema } from '@/lib/validations';
import { reviewLeaveRequest, deleteLeaveRequest } from '@/lib/services/hrm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = leaveReviewSchema.parse(body);

    const { data, error } = await reviewLeaveRequest(
      ctx.supabase,
      ctx.organizationId,
      ctx.userId,
      id,
      parsed.status,
      parsed.reviewNote
    );
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'review_leave_request',
      entityType: 'leave_request',
      entityId: id,
      meta: { status: parsed.status },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { error } = await deleteLeaveRequest(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'delete_leave_request',
      entityType: 'leave_request',
      entityId: id,
      ip: getIp(request)
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
