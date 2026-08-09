import { requireAuth, handleApiError, ok, writeAudit, getIp, logActivity } from '@/lib/api';
import { shipmentSchema } from '@/lib/validations';
import {
  getShipment,
  updateShipment,
  deleteShipment,
  setShipmentStatus,
  addShipmentEvent
} from '@/lib/services/shipments';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getShipment(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Shipment not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const prev = await getShipment(ctx.supabase, ctx.organizationId, id);
    if (!prev.data) return ok({ error: 'Shipment not found' }, { status: 404 });

    let data;
    if (body.status && Object.keys(body).length === 1) {
      const result = await setShipmentStatus(ctx.supabase, ctx.organizationId, id, body.status);
      data = result.data;
      if (!result.error && body.status !== prev.data.status) {
        await addShipmentEvent(ctx.supabase, ctx.organizationId, ctx.userId, {
          shipmentId: id,
          stage: body.status,
          note: `Status changed from ${prev.data.status} to ${body.status}`
        });
        await logActivity(ctx.supabase, {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          type: 'status_changed',
          entityType: 'shipment',
          entityId: id,
          description: `Shipment ${prev.data.shipment_number}: ${prev.data.status} -> ${body.status}`
        });
      }
    } else {
      const parsed = shipmentSchema.parse(body);
      const result = await updateShipment(ctx.supabase, ctx.organizationId, id, parsed);
      data = result.data;
    }

    if (data) {
      await writeAudit(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'update_shipment',
        entityType: 'shipment',
        entityId: id,
        ip: getIp(request)
      });
    }

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteShipment(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
