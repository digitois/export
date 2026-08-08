import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';
import { createOrder, createSubscription, isRazorpayConfigured } from '@/lib/razorpay';
import { getOrgContext } from '@/lib/auth';

const checkoutSchema = z.object({
  type: z.enum(['order', 'subscription']),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().length(3).default('INR'),
  receipt: z.string().optional(),
  planId: z.string().uuid().optional(),
  cycle: z.enum(['monthly', 'annual']).default('monthly'),
  totalCount: z.coerce.number().int().min(1).max(120).default(12)
});

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const org = await getOrgContext();

    if (!isRazorpayConfigured()) {
      return ok({ error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' }, { status: 503 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.parse(body);

    if (parsed.type === 'subscription') {
      if (!parsed.planId) return ok({ error: 'planId is required' }, { status: 400 });

      const { data: plan } = await ctx.supabase
        .from('plans')
        .select('razorpay_plan_id_monthly, razorpay_plan_id_annual')
        .eq('id', parsed.planId)
        .single();

      const rzpPlanId = parsed.cycle === 'annual' ? plan?.razorpay_plan_id_annual : plan?.razorpay_plan_id_monthly;
      if (!rzpPlanId) {
        return ok({ error: 'This plan is not available for online subscription yet.' }, { status: 400 });
      }

      const subscription = await createSubscription({
        planId: rzpPlanId,
        totalCount: parsed.cycle === 'annual' ? 12 : parsed.totalCount,
        customerEmail: ctx.email,
        customerName: ctx.organizationName,
        notes: { organization_id: ctx.organizationId, plan_id: parsed.planId, cycle: parsed.cycle }
      });

      return ok(subscription);
    }

    const order = await createOrder({
      amount: parsed.amount ?? 0,
      currency: parsed.currency,
      receipt: parsed.receipt ?? `receipt_${Date.now()}`,
      notes: { organization_id: ctx.organizationId }
    });

    return ok(order);
  } catch (err) {
    return handleApiError(err);
  }
}
