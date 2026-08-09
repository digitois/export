import 'server-only';
import type { GatewayAdapter, GatewayCredentials, CreateGatewayOrderInput, GatewayOrder } from './types';
import { verifyHmac } from './crypto';

const API_BASE = 'https://www.instamojo.com/api/3a';

/**
 * Instamojo adapter. Uses apiKey + authToken and creates a payment request
 * the buyer pays via the returned paymentUrl.
 */
async function instamojoRequest<T>(path: string, config: GatewayCredentials, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Api-Key': config.keyId ?? '',
      'X-Auth-Token': config.authToken ?? ''
    },
    body: body ? new URLSearchParams(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]))).toString() : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instamojo API error (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

const instamojoAdapter: GatewayAdapter = {
  name: 'instamojo',
  displayName: 'Instamojo',

  isConfigured(config: GatewayCredentials): boolean {
    return Boolean(config.keyId && config.authToken);
  },

  async createOrder(input: CreateGatewayOrderInput, config: GatewayCredentials): Promise<GatewayOrder> {
    const res = await instamojoRequest<{ payment_request?: { id: string; longurl?: string; status?: string }; errors?: Record<string, string[]> }>(
      '/payment-requests/',
      config,
      {
        purpose: input.notes?.receipt ?? 'Payment',
        amount: input.amount,
        currency: input.currency,
        buyer_name: input.notes?.customer_name,
        buyer_email: input.notes?.customer_email,
        buyer_phone: input.notes?.customer_phone,
        redirect_url: 'https://export.os/api/payments/webhook/instamojo'
      }
    );

    if (!res.payment_request?.id) {
      throw new Error(`Instamojo API error: ${JSON.stringify(res.errors ?? res)}`);
    }

    return {
      gateway: 'instamojo',
      orderId: res.payment_request.id,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: res.payment_request.longurl,
      checkoutParams: { paymentRequestId: res.payment_request.id, longurl: res.payment_request.longurl }
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string, config: GatewayCredentials): boolean {
    // Instamojo signs the raw body with the webhook secret (HMAC-SHA1)
    return verifyHmac('sha1', rawBody, config.webhookSecret ?? '', signature);
  }
};

export default instamojoAdapter;
