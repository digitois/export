import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { packingListSchema, paginationSchema } from '@/lib/validations';
import { listPackingLists, createPackingList } from '@/lib/services/packing-lists';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listPackingLists(ctx.supabase, ctx.organizationId, {
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
    const parsed = packingListSchema.parse(body);

    const packingListNumber = await getNextSequence(ctx.supabase, ctx.organizationId, 'PKL');

    const { data, error } = await createPackingList(ctx.supabase, ctx.organizationId, ctx.userId, packingListNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_packing_list',
      entityType: 'packing_list',
      entityId: data?.id,
      meta: { number: packingListNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
