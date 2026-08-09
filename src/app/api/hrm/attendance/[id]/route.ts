import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { deleteAttendance } from '@/lib/services/hrm';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { error } = await deleteAttendance(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'delete_attendance',
      entityType: 'attendance',
      entityId: id,
      ip: getIp(request)
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
