import { requireAuth, handleApiError, ok, logActivity } from '@/lib/api';
import { setQuotationStatus } from '@/lib/services/quotations';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(body.status)) {
      return ok({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await setQuotationStatus(ctx.supabase, ctx.organizationId, id, body.status);
    if (error) return ok({ error: error.message }, { status: 400 });

    await logActivity(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      type: 'status_changed',
      entityType: 'quotation',
      entityId: id,
      description: `Quotation ${data?.quotation_number ?? id} marked as ${body.status}`
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
