import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { shipmentEventSchema } from '@/lib/validations';
import { addShipmentEvent } from '@/lib/services/shipments';

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = shipmentEventSchema.parse(body);

    const { data, error } = await addShipmentEvent(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_shipment_event',
      entityType: 'shipment',
      entityId: parsed.shipmentId,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
