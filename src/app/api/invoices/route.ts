import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { invoiceSchema, paginationSchema } from '@/lib/validations';
import { listInvoices, createInvoice } from '@/lib/services/invoices';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listInvoices(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      status: params.status,
      type: params.type
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = invoiceSchema.parse(body);

    const prefix = parsed.invoiceType === 'credit_note' ? 'CN' : parsed.invoiceType === 'debit_note' ? 'DN' : 'INV';
    const invoiceNumber = await getNextSequence(ctx.supabase, ctx.organizationId, prefix);

    const { data, error } = await createInvoice(ctx.supabase, ctx.organizationId, ctx.userId, invoiceNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_invoice',
      entityType: 'invoice',
      entityId: data?.id,
      meta: { number: invoiceNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
