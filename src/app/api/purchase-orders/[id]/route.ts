import { requireAuth, handleApiError, ok } from '@/lib/api';
import { purchaseOrderSchema } from '@/lib/validations';
import {
  getPurchaseOrder,
  updatePurchaseOrder,
  setPOStatus,
  receivePurchaseOrder,
  deletePurchaseOrder
} from '@/lib/services/purchase-orders';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getPurchaseOrder(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Purchase order not found' }, { status: 404 });
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

    // Handle status-only updates
    if (body.status && Object.keys(body).length === 1) {
      const { data, error } = await setPOStatus(ctx.supabase, ctx.organizationId, id, body.status);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    // Handle receive action
    if (body.receive && Array.isArray(body.receivedItems)) {
      const { data, error } = await receivePurchaseOrder(ctx.supabase, ctx.organizationId, ctx.userId, id, body.receivedItems);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    // Full update
    const parsed = purchaseOrderSchema.parse(body);
    const { data, error } = await updatePurchaseOrder(ctx.supabase, ctx.organizationId, id, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deletePurchaseOrder(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}