import { requireAuth, handleApiError, ok } from '@/lib/api';
import { setInvoiceStatus } from '@/lib/services/invoices';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'].includes(body.status)) {
      return ok({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await setInvoiceStatus(ctx.supabase, ctx.organizationId, id, body.status);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
