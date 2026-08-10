import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { saasInvoicePaymentSchema } from '@/lib/validations';
import { getSaasInvoice, setSaasInvoiceStatus, recordSaasInvoicePayment, deleteSaasInvoice } from '@/lib/services/saas-billing';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const { data, error } = await getSaasInvoice(ctx.supabase, id);
    if (error) return ok({ error: error.message }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { data: current } = await getSaasInvoice(ctx.supabase, id);
    if (!current) return ok({ error: 'Invoice not found' }, { status: 404 });

    let result: { data: unknown; error: unknown } = { data: null, error: null };

    if (body.status) {
      result = await setSaasInvoiceStatus(ctx.supabase, id, body.status as never);
    } else if (body.payment) {
      const parsed = saasInvoicePaymentSchema.parse(body.payment);
      result = await recordSaasInvoicePayment(ctx.supabase, id, parsed.amount);
    }

    if (result.error) return ok({ error: (result.error as Error).message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: current.organization_id,
      userId: ctx.userId,
      action: body.status ? 'update_saas_invoice_status' : 'record_saas_invoice_payment',
      entityType: 'saas_invoice',
      entityId: id,
      meta: { status: body.status, payment: body.payment },
      ip: getIp(request)
    });

    return ok(result.data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const { error } = await deleteSaasInvoice(ctx.supabase, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
