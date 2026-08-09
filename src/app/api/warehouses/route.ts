import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { warehouseSchema, paginationSchema } from '@/lib/validations';
import { listWarehouses, createWarehouse } from '@/lib/services/warehouses';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const { items } = await listWarehouses(ctx.supabase, ctx.organizationId);
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = warehouseSchema.parse(body);

    const { data, error } = await createWarehouse(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_warehouse',
      entityType: 'warehouse',
      entityId: data?.id,
      meta: { name: parsed.name },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}