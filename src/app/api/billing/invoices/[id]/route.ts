import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getSaasInvoice } from '@/lib/services/saas-billing';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getSaasInvoice(ctx.supabase, id);

    if (error || data?.organization_id !== ctx.organizationId) {
      return ok({ error: 'Invoice not found' }, { status: 404 });
    }

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
