import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { quotationSchema } from '@/lib/validations';
import { getQuotation, updateQuotation, deleteQuotation } from '@/lib/services/quotations';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getQuotation(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Quotation not found' }, { status: 404 });
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
    const parsed = quotationSchema.parse(body);

    const { data, error } = await updateQuotation(ctx.supabase, ctx.organizationId, id, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_quotation',
      entityType: 'quotation',
      entityId: id,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteQuotation(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
