import 'server-only';
import type { GatewayAdapter, GatewayCredentials, CreateGatewayOrderInput, GatewayOrder } from './types';
import { verifyHmac } from './crypto';

const API_BASE = 'https://api.cashfree.com/pg';

/**
 * Cashfree adapter. Uses clientId + clientSecret (server auth token) and
 * creates a PG order returned to the client for a hosted payment page.
 */
async function cashfreeRequest<T>(path: string, config: GatewayCredentials, body?: Record<string, unknown>, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'x-api-version': '2023-08-01',
    'x-client-id': config.keyId ?? '',
    'x-client-secret': config.keySecret ?? ''
  };
  if (token) headers['x-client-token'] = token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cashfree API error (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

const cashfreeAdapter: GatewayAdapter = {
  name: 'cashfree',
  displayName: 'Cashfree',

  isConfigured(config: GatewayCredentials): boolean {
    return Boolean(config.keyId && config.keySecret);
  },

  async createOrder(input: CreateGatewayOrderInput, config: GatewayCredentials): Promise<GatewayOrder> {
    const order = await cashfreeRequest<{ order_id: string; order_amount: number; order_currency: string; order_status: string; payment_session_id?: string; payment_link?: string }>(
      '/orders',
      config,
      {
        order_id: input.receipt,
        order_amount: input.amount,
        order_currency: input.currency,
        order_note: input.notes?.receipt,
        customer_details: {
          customer_id: input.notes?.organization_id ?? 'default',
          customer_name: input.notes?.customer_name,
          customer_email: input.notes?.customer_email,
          customer_phone: input.notes?.customer_phone
        }
      }
    );

    return {
      gateway: 'cashfree',
      orderId: order.order_id,
      amount: order.order_amount,
      currency: order.order_currency,
      redirectUrl: order.payment_link,
      checkoutParams: {
        orderId: order.order_id,
        paymentSessionId: order.payment_session_id,
        clientId: config.keyId,
        env: 'production'
      }
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string, config: GatewayCredentials): boolean {
    // Cashfree sends the HMAC in "x-webhook-signature" as base64(hash_hmac('sha256', payload, secret))
    return verifyHmac('sha256', rawBody, config.webhookSecret ?? '', signature);
  }
};

export default cashfreeAdapter;
