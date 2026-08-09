import 'server-only';
import type { GatewayAdapter, GatewayCredentials, CreateGatewayOrderInput, GatewayOrder } from './types';
import { verifyHmac } from './crypto';

const API_BASE = 'https://api.stripe.com/v1';

/**
 * Stripe adapter. Uses publishable key + secret key. Orders map to Payment
 * Intents (one-time) or Checkout Sessions (subscriptions).
 */
function auth(config: GatewayCredentials): string {
  return `Bearer ${config.keySecret ?? ''}`;
}

function stripeRequest<T>(method: string, path: string, config: GatewayCredentials, body?: Record<string, unknown>): Promise<T> {
  const form = new URLSearchParams();
  if (body) {
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) form.append(`${k}[]`, String(item));
      } else {
        form.append(k, String(v));
      }
    }
  }
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: auth(config),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString() || undefined
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe API error (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  });
}

const stripeAdapter: GatewayAdapter = {
  name: 'stripe',
  displayName: 'Stripe',

  isConfigured(config: GatewayCredentials): boolean {
    return Boolean(config.keySecret && config.publishableKey);
  },

  async createOrder(input: CreateGatewayOrderInput, config: GatewayCredentials): Promise<GatewayOrder> {
    const intent = await stripeRequest<{ id: string; client_secret: string; amount: number; currency: string }>(
      'POST',
      '/payment_intents',
      config,
      {
        amount: Math.round(input.amount * 100),
        currency: input.currency.toLowerCase(),
        metadata: { receipt: input.receipt, ...input.notes },
        automatic_payment_methods: { enabled: true }
      }
    );

    return {
      gateway: 'stripe',
      orderId: intent.id,
      amount: intent.amount / 100,
      currency: input.currency,
      checkoutParams: { clientSecret: intent.client_secret, publishableKey: config.publishableKey }
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string, config: GatewayCredentials): boolean {
    // Stripe sends "t=...,v1=..." — extract v1 and verify against webhook secret
    const parts = signature.split(',');
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3) ?? '';
    const secret = config.webhookSecret ?? '';
    if (!v1 || !secret) return false;
    return verifyHmac('sha256', rawBody, secret, v1);
  }
};

export default stripeAdapter;
