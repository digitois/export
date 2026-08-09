import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { employeeSchema } from '@/lib/validations';
import { updateEmployee, deleteEmployee, getEmployee } from '@/lib/services/hrm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = employeeSchema.parse(body);

    const { data, error } = await updateEmployee(ctx.supabase, ctx.organizationId, id, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_employee',
      entityType: 'employee',
      entityId: id,
      meta: { fullName: parsed.fullName },
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

    const { error } = await deleteEmployee(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'delete_employee',
      entityType: 'employee',
      entityId: id,
      ip: getIp(request)
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getEmployee(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
