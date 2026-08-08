import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyWebhookSignature } from '@/lib/razorpay';

/**
 * Razorpay webhook endpoint. Verifies the HMAC signature and records
 * payments / activates subscriptions. Secret is configured via
 * RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event: string;
    payload: {
      payment?: { entity?: Record<string, unknown> };
      subscription?: { entity?: Record<string, unknown> };
    };
    contains?: string[];
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.event) {
      case 'payment.captured': {
        const entity = event.payload.payment?.entity ?? {};
        await service.from('payments').upsert({
          razorpay_payment_id: entity.id as string,
          razorpay_order_id: (entity.order_id as string) ?? null,
          amount: Number((entity.amount as number) ?? 0) / 100,
          currency: (entity.currency as string) ?? 'INR',
          status: 'captured',
          method: entity.method as string,
          metadata: entity as unknown as Record<string, unknown>
        }, { onConflict: 'razorpay_payment_id' });
        break;
      }
      case 'payment.failed': {
        const entity = event.payload.payment?.entity ?? {};
        await service.from('payments').upsert({
          razorpay_payment_id: entity.id as string,
          razorpay_order_id: (entity.order_id as string) ?? null,
          amount: Number((entity.amount as number) ?? 0) / 100,
          currency: (entity.currency as string) ?? 'INR',
          status: 'failed',
          metadata: entity as unknown as Record<string, unknown>
        }, { onConflict: 'razorpay_payment_id' });
        break;
      }
      case 'subscription.activated':
      case 'subscription.charged': {
        const entity = event.payload.subscription?.entity ?? {};
        const subscriptionId = entity.id as string;
        const notes = (entity.notes as Record<string, string>) ?? {};

        await service.from('subscriptions').upsert({
          organization_id: notes.organization_id,
          plan_id: notes.plan_id,
          status: 'active',
          billing_cycle: notes.cycle === 'annual' ? 'annual' : 'monthly',
          razorpay_subscription_id: subscriptionId,
          current_period_start: entity.current_start ? new Date((entity.current_start as number) * 1000).toISOString() : null,
          current_period_end: entity.current_end ? new Date((entity.current_end as number) * 1000).toISOString() : null
        }, { onConflict: 'razorpay_subscription_id' });

        await service
          .from('organizations')
          .update({ status: 'active' })
          .eq('id', notes.organization_id);
        break;
      }
      case 'subscription.cancelled': {
        const entity = event.payload.subscription?.entity ?? {};
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: true })
          .eq('razorpay_subscription_id', entity.id);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
