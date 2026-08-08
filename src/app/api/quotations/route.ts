import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { quotationSchema, paginationSchema } from '@/lib/validations';
import { listQuotations, createQuotation } from '@/lib/services/quotations';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listQuotations(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      status: params.status
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
    const parsed = quotationSchema.parse(body);

    const quotationNumber = await getNextSequence(ctx.supabase, ctx.organizationId, 'Q');

    const { data, error } = await createQuotation(ctx.supabase, ctx.organizationId, ctx.userId, quotationNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_quotation',
      entityType: 'quotation',
      entityId: data?.id,
      meta: { number: quotationNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
