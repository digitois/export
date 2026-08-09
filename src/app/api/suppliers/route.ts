import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { supplierSchema, paginationSchema } from '@/lib/validations';
import { listSuppliers, createSupplier } from '@/lib/services/suppliers';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listSuppliers(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q
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
    const parsed = supplierSchema.parse(body);

    const { data, error } = await createSupplier(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_supplier',
      entityType: 'supplier',
      entityId: data?.id,
      meta: { name: parsed.name },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}