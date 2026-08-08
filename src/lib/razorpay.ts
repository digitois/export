import 'server-only';

const API_BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const key = process.env.RAZORPAY_KEY_ID ?? '';
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

async function request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay API error (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export interface CreateOrderInput {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createOrder(input: CreateOrderInput) {
  return request<Record<string, unknown>>('POST', '/orders', {
    amount: Math.round(input.amount * 100),
    currency: input.currency ?? 'INR',
    receipt: input.receipt,
    notes: input.notes
  });
}

export async function capturePayment(paymentId: string, amount: number) {
  return request<Record<string, unknown>>('POST', `/payments/${paymentId}/capture`, {
    amount: Math.round(amount * 100)
  });
}

export async function getPayment(paymentId: string) {
  return request<Record<string, unknown>>('GET', `/payments/${paymentId}`);
}

export interface CreateSubscriptionInput {
  planId: string;
  totalCount: number;
  customerEmail: string;
  customerName?: string;
  notes?: Record<string, string>;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  return request<Record<string, unknown>>('POST', '/subscriptions', {
    plan_id: input.planId,
    total_count: input.totalCount,
    customer_notify: 1,
    notes: { ...input.notes, customer_email: input.customerEmail, customer_name: input.customerName }
  });
}

export async function getSubscription(subscriptionId: string) {
  return request<Record<string, unknown>>('GET', `/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string) {
  return request<Record<string, unknown>>('POST', `/subscriptions/${subscriptionId}/cancel`, {
    cancel_at_cycle_end: 1
  });
}

export async function getPlans() {
  return request<{ items: Array<Record<string, unknown>> }>('GET', '/plans');
}

export interface WebhookEvent {
  event: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const { createHmac, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
