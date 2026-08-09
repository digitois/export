import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getAdapter, isKnownProvider, type GatewayProvider } from '@/lib/payment-gateways';

/**
 * Generic gateway webhook endpoint. Verifies the provider signature and
 * records the payment against the org matched by the order reference.
 *
 * Signature headers:
 *   razorpay  -> x-razorpay-signature
 *   stripe    -> stripe-signature
 *   phonepe   -> x-verify
 *   cashfree  -> x-webhook-signature
 *   instamojo -> x-instamojo-signature
 */
export async function POST(request: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params;

  if (!isKnownProvider(gateway)) {
    return NextResponse.json({ error: 'Unknown gateway' }, { status: 400 });
  }

  const rawBody = await request.text();
  const provider = gateway as GatewayProvider;
  const adapter = getAdapter(provider);

  const signature =
    request.headers.get('x-razorpay-signature') ??
    request.headers.get('stripe-signature') ??
    request.headers.get('x-verify') ??
    request.headers.get('x-webhook-signature') ??
    request.headers.get('x-instamojo-signature') ??
    '';

  const service = createServiceClient();

  // Resolve the org from the payload notes so we can verify its gateway secret
  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const orgId =
    (payload.notes ?? {}).organization_id ??
    (payload.metadata as Record<string, string> | undefined)?.organization_id;

  if (!orgId) {
    return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
  }

  const { data: gwRow } = await service
    .from('payment_gateways')
    .select('*')
    .eq('organization_id', orgId)
    .eq('provider', provider)
    .single();

  if (!gwRow || !gwRow.enabled) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 400 });
  }

  const config = (gwRow.config ?? {}) as Record<string, string | undefined>;
  const secret = config.webhookSecret ?? process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

  if (!secret || !adapter.verifyWebhookSignature(rawBody, signature, { ...config, webhookSecret: secret })) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Extract generic fields (kept deliberately simple; per-gateway normalization
    // can be expanded by provider later).
    const id = extractId(provider, rawBody, payload);
    if (id) {
      await service.from('payments').upsert(
        {
          organization_id: orgId,
          gateway: provider,
          provider_payment_id: id,
          amount: Number(payload.amount ?? payload.payment?.amount ?? 0) / 100,
          currency: (payload.currency as string) ?? 'INR',
          status: 'captured',
          metadata: { raw: payload }
        },
        { onConflict: 'provider_payment_id' }
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

function extractId(provider: GatewayProvider, rawBody: string, payload: Record<string, unknown>): string | null {
  switch (provider) {
    case 'razorpay':
      return (payload.payment as { entity?: { id?: string } })?.entity?.id ?? null;
    case 'stripe':
      return (payload.data as { object?: { payment_intent?: string; id?: string } })?.object?.payment_intent
        ?? (payload.data as { object?: { id?: string } })?.object?.id
        ?? null;
    case 'phonepe': {
      const match = rawBody.match(/"merchantTransactionId"\s*:\s*"([^"]+)"/);
      return match?.[1] ?? null;
    }
    case 'cashfree':
      return (payload.order as { order_id?: string })?.order_id ?? null;
    case 'instamojo':
      return (payload.payment as { payment_request_id?: string })?.payment_request_id ?? null;
    default:
      return null;
  }
}
