import { requireAuth, handleApiError, ok } from '@/lib/api';
import { checkoutSchema, checkoutGatewaySchema } from '@/lib/validations';
import { getAdapter } from '@/lib/payment-gateways';
import { getDefaultGatewayConfig } from '@/lib/services/payment-gateways';

/**
 * Creates a payment order through the org's default (or requested) gateway.
 * Also supports Razorpay subscriptions for the billing flow.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    // Subscription flow (Razorpay plans) — preserved from the original billing path
    const sub = checkoutSchema.safeParse(body);
    if (sub.success && sub.data.type === 'subscription') {
      const { isRazorpayConfigured, createSubscription } = await import('@/lib/razorpay');
      if (!isRazorpayConfigured()) {
        return ok({ error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' }, { status: 503 });
      }

      const { data: plan } = await ctx.supabase
        .from('plans')
        .select('razorpay_plan_id_monthly, razorpay_plan_id_annual')
        .eq('id', sub.data.planId)
        .single();

      const rzpPlanId = sub.data.cycle === 'annual' ? plan?.razorpay_plan_id_annual : plan?.razorpay_plan_id_monthly;
      if (!rzpPlanId) {
        return ok({ error: 'This plan is not available for online subscription yet.' }, { status: 400 });
      }

      const subscription = await createSubscription({
        planId: rzpPlanId,
        totalCount: sub.data.cycle === 'annual' ? 12 : sub.data.totalCount,
        customerEmail: ctx.email,
        customerName: ctx.organizationName,
        notes: { organization_id: ctx.organizationId, plan_id: sub.data.planId ?? '', cycle: sub.data.cycle }
      });

      return ok(subscription);
    }

    // Gateway-aware one-time payment order
    const parsed = checkoutGatewaySchema.parse(body);

    const { data: gwConfig, error } = await getDefaultGatewayConfig(ctx.supabase, ctx.organizationId);
    if (error || !gwConfig) {
      return ok({ error: 'No payment gateway is configured. Enable one in Settings → Billing.' }, { status: 400 });
    }

    const adapter = getAdapter(gwConfig.provider);
    const config = gwConfig.config as Record<string, string | undefined>;

    if (!adapter.isConfigured(config)) {
      return ok({ error: `${adapter.displayName} is not fully configured.` }, { status: 400 });
    }

    const order = await adapter.createOrder({
      amount: parsed.amount,
      currency: parsed.currency,
      receipt: parsed.receipt ?? `receipt_${Date.now()}`,
      notes: {
        organization_id: ctx.organizationId,
        customer_email: parsed.customerEmail ?? '',
        customer_name: parsed.customerName ?? '',
        customer_phone: parsed.customerPhone ?? '',
        receipt: parsed.receipt ?? 'Payment'
      }
    }, config);

    return ok(order);
  } catch (err) {
    return handleApiError(err);
  }
}
