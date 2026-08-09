import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { updatePlan, deletePlan, planPayloadToSnake } from '@/lib/services/admin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const payload = planPayloadToSnake(body as Record<string, unknown>);

    const { data, error } = await updatePlan(ctx.supabase, id, payload);
    if (error) return ok({ error: error.message }, { status: 400 });
    if (!data) return ok({ error: 'Plan not found' }, { status: 404 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;

    const { error } = await deletePlan(ctx.supabase, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}