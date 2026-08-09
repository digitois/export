import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { isKnownProvider } from '@/lib/payment-gateways';
import { setDefaultGateway } from '@/lib/services/payment-gateways';

export async function PATCH(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const ctx = await requireAuth();
    const { provider } = await params;

    if (!isKnownProvider(provider)) {
      return ok({ error: 'Unknown payment gateway' }, { status: 400 });
    }

    const { data, error } = await setDefaultGateway(ctx.supabase, ctx.organizationId, provider);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'set_default_gateway',
      entityType: 'payment_gateway',
      entityId: data?.id,
      meta: { provider },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
