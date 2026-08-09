import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { paymentGatewaySchema } from '@/lib/validations';
import { listGatewayConfigs, saveGatewayConfig } from '@/lib/services/payment-gateways';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const { items } = await listGatewayConfigs(ctx.supabase, ctx.organizationId);
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = paymentGatewaySchema.parse(body);

    const { data, error } = await saveGatewayConfig(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'save_payment_gateway',
      entityType: 'payment_gateway',
      entityId: data?.id,
      meta: { provider: parsed.provider, enabled: parsed.enabled },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
