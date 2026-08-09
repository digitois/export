import 'server-only';
import type { GatewayAdapter, GatewayCredentials, GatewayProvider } from './types';
import stripeAdapter from './stripe';
import phonePeAdapter from './phonepe';
import cashfreeAdapter from './cashfree';
import instamojoAdapter from './instamojo';

export * from './types';

const ADAPTERS: Record<GatewayProvider, GatewayAdapter> = {
  razorpay: {
    name: 'razorpay',
    displayName: 'Razorpay',
    isConfigured: (config: GatewayCredentials) => Boolean(config.keyId && config.keySecret),
    async createOrder(input) {
      // Razorpay is wrapped by src/lib/razorpay.ts; expose a thin passthrough here
      const { createOrder } = await import('@/lib/razorpay');
      const order = await createOrder({ amount: input.amount, currency: input.currency, receipt: input.receipt, notes: input.notes });
      return {
        gateway: 'razorpay',
        orderId: order.id as string,
        amount: input.amount,
        currency: input.currency,
        checkoutParams: { orderId: order.id }
      };
    },
    verifyWebhookSignature(rawBody, signature, config) {
      const { verifyWebhookSignature } = require('@/lib/razorpay') as typeof import('@/lib/razorpay');
      return verifyWebhookSignature(rawBody, signature, config.webhookSecret ?? '');
    }
  },
  stripe: stripeAdapter,
  phonepe: phonePeAdapter,
  cashfree: cashfreeAdapter,
  instamojo: instamojoAdapter
};

export const GATEWAY_PROVIDERS = Object.keys(ADAPTERS) as GatewayProvider[];

export function getAdapter(provider: GatewayProvider): GatewayAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unsupported payment gateway: ${provider}`);
  return adapter;
}

export function isKnownProvider(provider: string): provider is GatewayProvider {
  return provider in ADAPTERS;
}

export function isConfigured(provider: GatewayProvider, config: GatewayCredentials): boolean {
  return getAdapter(provider).isConfigured(config);
}
