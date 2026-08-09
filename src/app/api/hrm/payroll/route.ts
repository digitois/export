import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { payrollRunSchema } from '@/lib/validations';
import { listPayrollRuns, createPayrollRun } from '@/lib/services/hrm';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const { items } = await listPayrollRuns(ctx.supabase, ctx.organizationId);
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = payrollRunSchema.parse(body);

    const { data, error } = await createPayrollRun(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_payroll_run',
      entityType: 'payroll_run',
      entityId: data?.id,
      meta: { periodStart: parsed.periodStart, periodEnd: parsed.periodEnd },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
