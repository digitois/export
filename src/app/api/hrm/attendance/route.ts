import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { attendanceSchema } from '@/lib/validations';
import { listAttendance, upsertAttendance } from '@/lib/services/hrm';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const { items } = await listAttendance(ctx.supabase, ctx.organizationId, {
      employeeId: url.searchParams.get('employeeId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined
    });
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = attendanceSchema.parse(body);

    const { data, error } = await upsertAttendance(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'upsert_attendance',
      entityType: 'attendance',
      entityId: data?.id,
      meta: { employeeId: parsed.employeeId, date: parsed.attendanceDate },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
