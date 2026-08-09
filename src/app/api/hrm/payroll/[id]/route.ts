import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { generatePayrollLines, setPayrollStatus } from '@/lib/services/hrm';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { data, error } = await generatePayrollLines(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'generate_payroll_lines',
      entityType: 'payroll_run',
      entityId: id,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const status = body.status as 'paid' | 'cancelled';

    if (!status || !['paid', 'cancelled'].includes(status)) {
      return ok({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await setPayrollStatus(ctx.supabase, ctx.organizationId, id, status);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'set_payroll_status',
      entityType: 'payroll_run',
      entityId: id,
      meta: { status },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
