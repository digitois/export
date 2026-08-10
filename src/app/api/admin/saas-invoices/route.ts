import { requireAdmin } from '@/lib/admin';
import { handleApiError, paginated, ok, writeAudit, getIp } from '@/lib/api';
import { paginationSchema, saasInvoiceSchema } from '@/lib/validations';
import { listSaasInvoices, createSaasInvoice } from '@/lib/services/saas-billing';

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin();
    const url = new URL(request.url);
    const parsed = paginationSchema.parse(Object.fromEntries(url.searchParams));
    const status = url.searchParams.get('status') ?? undefined;
    const organizationId = url.searchParams.get('organizationId') ?? undefined;

    const { items, count } = await listSaasInvoices(ctx.supabase, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      status,
      organizationId
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json();
    const parsed = saasInvoiceSchema.parse(body);

    const { data, error } = await createSaasInvoice(ctx.supabase, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: parsed.organizationId,
      userId: ctx.userId,
      action: 'create_saas_invoice',
      entityType: 'saas_invoice',
      entityId: data?.id,
      meta: { invoiceNumber: data?.invoice_number, total: data?.total },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
