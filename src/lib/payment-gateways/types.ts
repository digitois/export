export type GatewayProvider = 'razorpay' | 'stripe' | 'phonepe' | 'cashfree' | 'instamojo';

export interface GatewayCredentials {
  keyId?: string;
  keySecret?: string;
  merchantId?: string;
  salt?: string;
  saltIndex?: string;
  webhookSecret?: string;
  authToken?: string;
  publishableKey?: string;
}

export interface CreateGatewayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface GatewayOrder {
  gateway: GatewayProvider;
  orderId: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
  paymentUrl?: string;
  checkoutParams: Record<string, unknown>;
}

export interface GatewayAdapter {
  name: GatewayProvider;
  displayName: string;
  isConfigured(config: GatewayCredentials): boolean;
  createOrder(input: CreateGatewayOrderInput, config: GatewayCredentials): Promise<GatewayOrder>;
  verifyWebhookSignature(rawBody: string, signature: string, config: GatewayCredentials): boolean;
}

export interface GatewayConfigRow {
  id: string;
  organization_id: string;
  provider: GatewayProvider;
  enabled: boolean;
  is_default: boolean;
  test_mode: boolean;
  config: GatewayCredentials;
  created_at: string;
  updated_at: string;
}
