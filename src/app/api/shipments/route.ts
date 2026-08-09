import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { shipmentSchema, paginationSchema } from '@/lib/validations';
import { listShipments, createShipment } from '@/lib/services/shipments';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listShipments(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      status: params.status,
      mode: params.mode
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
    const parsed = shipmentSchema.parse(body);

    const shipmentNumber = await getNextSequence(ctx.supabase, ctx.organizationId, 'SHP');

    const { data, error } = await createShipment(ctx.supabase, ctx.organizationId, ctx.userId, shipmentNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_shipment',
      entityType: 'shipment',
      entityId: data?.id,
      meta: { number: shipmentNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
