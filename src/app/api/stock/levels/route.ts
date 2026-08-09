import { requireAuth, handleApiError, ok, paginated } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { listStockLevels } from '@/lib/services/stock';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, error } = await listStockLevels(ctx.supabase, ctx.organizationId, {
      warehouseId: params.warehouseId,
      lowStockOnly: params.lowStockOnly === 'true'
    });
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}