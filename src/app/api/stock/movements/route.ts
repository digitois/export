import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { stockMovementSchema, paginationSchema } from '@/lib/validations';
import { listStockMovements, createStockMovement, adjustStock } from '@/lib/services/stock';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listStockMovements(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      productId: params.productId,
      warehouseId: params.warehouseId,
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
    const parsed = stockMovementSchema.parse(body);

    // If referenceType/referenceId provided, treat as adjustment with stock level update
    let data, error;
    if (parsed.referenceType && parsed.referenceId) {
      const refType: string = parsed.referenceType;
      const refId: string = parsed.referenceId;
      const result = await adjustStock(ctx.supabase, ctx.organizationId, ctx.userId,
        parsed.productId, parsed.warehouseId,
        parsed.type === 'in' ? parsed.quantity : -parsed.quantity,
        refType, refId, parsed.notes ?? null);
      data = result.data;
      error = result.error;
    } else {
      const result = await createStockMovement(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
      data = result.data;
      error = result.error;
    }

    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_stock_movement',
      entityType: 'stock_movement',
      entityId: data?.id,
      meta: { type: parsed.type, quantity: parsed.quantity },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}