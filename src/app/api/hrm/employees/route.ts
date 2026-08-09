import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { employeeSchema } from '@/lib/validations';
import { listEmployees, createEmployee } from '@/lib/services/hrm';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const { items } = await listEmployees(ctx.supabase, ctx.organizationId, status);
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = employeeSchema.parse(body);

    const { data, error } = await createEmployee(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_employee',
      entityType: 'employee',
      entityId: data?.id,
      meta: { fullName: parsed.fullName, code: data?.employee_code },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
