import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { z } from 'zod';
import { getSubscription, cancelSubscription } from '@/lib/services/saas-billing';

const cancelSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true)
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const { data, error } = await getSubscription(ctx.supabase, id);
    if (error) return ok({ error: error.message }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = cancelSchema.parse(body);

    const { data, error } = await cancelSubscription(ctx.supabase, id, parsed.cancelAtPeriodEnd);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: data?.organization_id,
      userId: ctx.userId,
      action: 'cancel_subscription',
      entityType: 'subscription',
      entityId: id,
      meta: { cancelAtPeriodEnd: parsed.cancelAtPeriodEnd },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
