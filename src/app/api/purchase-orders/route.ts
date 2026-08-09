import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { purchaseOrderSchema, paginationSchema } from '@/lib/validations';
import { listPurchaseOrders, createPurchaseOrder } from '@/lib/services/purchase-orders';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listPurchaseOrders(ctx.supabase, ctx.organizationId, {
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
    const parsed = purchaseOrderSchema.parse(body);

    const poNumber = await getNextSequence(ctx.supabase, ctx.organizationId, 'PO');

    const { data, error } = await createPurchaseOrder(ctx.supabase, ctx.organizationId, ctx.userId, poNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_purchase_order',
      entityType: 'purchase_order',
      entityId: data?.id,
      meta: { number: poNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}