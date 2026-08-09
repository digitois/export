import 'server-only';
import type { GatewayAdapter, GatewayCredentials, CreateGatewayOrderInput, GatewayOrder } from './types';
import { phonePeChecksum, verifyPhonePeChecksum } from './crypto';

const API_BASE = 'https://api.phonepe.com/apis/hermes/pg/v1';

/**
 * PhonePe adapter. Uses merchantId + saltKey + saltIndex. Payments are
 * initiated server-side and the end-user is redirected to paymentUrl.
 */
const phonePeAdapter: GatewayAdapter = {
  name: 'phonepe',
  displayName: 'PhonePe',

  isConfigured(config: GatewayCredentials): boolean {
    return Boolean(config.merchantId && config.salt && config.saltIndex);
  },

  async createOrder(input: CreateGatewayOrderInput, config: GatewayCredentials): Promise<GatewayOrder> {
    const merchantTransactionId = input.receipt;
    const endpoint = '/pg/v1/pay';
    const body = {
      merchantId: config.merchantId,
      merchantTransactionId,
      merchantUserId: input.notes?.organization_id ?? config.merchantId,
      amount: Math.round(input.amount * 100),
      redirectUrl: `https://api.phonepe.com/apis/hermes/pg/v1/status/${config.merchantId}/${merchantTransactionId}`,
      redirectMode: 'POST',
      callbackUrl: 'https://export.os/api/payments/webhook/phonepe',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const rawBody = JSON.stringify(body);
    const xVerify = phonePeChecksum(rawBody, config.salt ?? '', config.saltIndex ?? '', endpoint);
    const base64Body = Buffer.from(rawBody).toString('base64');

    const res = await fetch(`${API_BASE}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': config.merchantId ?? ''
      },
      body: rawBody
    });

    const json = (await res.json()) as { success?: boolean; data?: { instrumentResponse?: { redirectInfo?: { url?: string } } }; code?: string; message?: string };
    if (!res.ok || !json.success) {
      throw new Error(`PhonePe API error (${res.status}): ${json.message ?? JSON.stringify(json)}`);
    }

    return {
      gateway: 'phonepe',
      orderId: merchantTransactionId,
      amount: input.amount,
      currency: input.currency,
      redirectUrl: json.data?.instrumentResponse?.redirectInfo?.url,
      checkoutParams: { merchantId: config.merchantId, merchantTransactionId, base64Body, xVerify }
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string, config: GatewayCredentials): boolean {
    return verifyPhonePeChecksum(rawBody, signature, config.salt ?? '', config.saltIndex ?? '', '/pg/v1/pay');
  }
};

export default phonePeAdapter;
