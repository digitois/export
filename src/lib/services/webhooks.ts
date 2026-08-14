import type { SupabaseClient } from '@supabase/supabase-js';

export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt: number;
  response_status?: number | null;
  response_body?: string | null;
  error?: string | null;
  next_retry_at?: string | null;
  created_at: string;
  delivered_at?: string | null;
}

export interface CreateWebhookEndpointInput {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  retry_count?: number;
  timeout_ms?: number;
}

export interface UpdateWebhookEndpointInput {
  name?: string;
  url?: string;
  secret?: string | null;
  events?: string[];
  is_active?: boolean;
  retry_count?: number;
  timeout_ms?: number;
}

export interface DeliverWebhookInput {
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

// ============================================
// WEBHOOK ENDPOINT CRUD
// ============================================

export async function createWebhookEndpoint(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateWebhookEndpointInput
) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: userId,
      retry_count: input.retry_count ?? 3,
      timeout_ms: input.timeout_ms ?? 10000
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getWebhookEndpoint(supabase: SupabaseClient, organizationId: string, endpointId: string) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', endpointId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listWebhookEndpoints(supabase: SupabaseClient, organizationId: string, opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function updateWebhookEndpoint(
  supabase: SupabaseClient,
  organizationId: string,
  endpointId: string,
  input: UpdateWebhookEndpointInput
) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', endpointId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function deleteWebhookEndpoint(supabase: SupabaseClient, organizationId: string, endpointId: string) {
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', endpointId);

  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function testWebhookEndpoint(supabase: SupabaseClient, organizationId: string, endpointId: string) {
  const { data: endpoint, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', endpointId)
    .single();

  if (error || !endpoint) return { data: null, error: new Error('Endpoint not found') };

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ExportOS-Signature': 'test'
      },
      body: JSON.stringify({
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: { message: 'Test webhook from Export OS' }
      }),
      signal: AbortSignal.timeout(endpoint.timeout_ms ?? 10000)
    });

    const responseText = await response.text();

    return { 
      data: { 
        success: response.ok, 
        status: response.status, 
        response: responseText 
      }, 
      error: undefined 
    };
  } catch (err) {
    return { 
      data: { 
        success: false, 
        error: err instanceof Error ? err.message : 'Connection failed' 
      }, 
      error: undefined 
    };
  }
}

// ============================================
// WEBHOOK DELIVERY
// ============================================

export async function deliverWebhook(
  supabase: SupabaseClient,
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  // Get all active endpoints subscribed to this event
  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .contains('events', [eventType]);

  if (error || !endpoints?.length) return { data: [], error: undefined };

  const results = [];

  for (const endpoint of endpoints) {
    await queueWebhookDelivery(supabase, endpoint.id, eventType, payload);
    results.push({ endpointId: endpoint.id, queued: true });
  }

  return { data: results, error: undefined };
}

export async function queueWebhookDelivery(
  supabase: SupabaseClient,
  endpointId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_endpoint_id: endpointId,
      event_type: eventType,
      payload,
      status: 'pending',
      attempt: 0
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function processWebhookDeliveries(supabase: SupabaseClient, limit = 50) {
  // Get pending deliveries ready to retry
  const { data: deliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook_endpoints(*)')
    .eq('status', 'pending')
    .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !deliveries?.length) return { processed: 0 };

  let processed = 0;

  for (const delivery of deliveries) {
    await processSingleDelivery(supabase, delivery);
    processed++;
  }

  return { processed };
}

async function processSingleDelivery(supabase: SupabaseClient, delivery: any) {
  const endpoint = delivery.webhook_endpoints;
  
  // Update attempt
  await supabase
    .from('webhook_deliveries')
    .update({ 
      attempt: delivery.attempt + 1, 
      status: 'retrying' 
    })
    .eq('id', delivery.id);

  try {
    // Generate signature
    const signature = generateWebhookSignature(endpoint.secret ?? '', delivery.payload);
    
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ExportOS-Signature': signature,
        'X-ExportOS-Event': delivery.event_type,
        'X-ExportOS-Delivery': delivery.id
      },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(endpoint.timeout_ms ?? 10000)
    });

    const responseBody = await response.text();

    if (response.ok) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'delivered',
          response_status: response.status,
          response_body: responseBody,
          delivered_at: new Date().toISOString()
        })
        .eq('id', delivery.id);
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
  } catch (err) {
    const nextAttempt = delivery.attempt + 1;
    const maxRetries = endpoint.retry_count ?? 3;
    
    if (nextAttempt >= maxRetries) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          attempt: nextAttempt
        })
        .eq('id', delivery.id);
    } else {
      // Schedule retry with exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, nextAttempt), 300000); // Max 5 minutes
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
      
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'retrying',
          error: err instanceof Error ? err.message : 'Unknown error',
          attempt: nextAttempt,
          next_retry_at: nextRetryAt
        })
        .eq('id', delivery.id);
    }
  }
}

function generateWebhookSignature(secret: string, payload: Record<string, unknown>): string {
  // In production, use HMAC-SHA256
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return 'sha256=' + hmac.digest('hex');
}

// ============================================
// WEBHOOK DELIVERY HISTORY
// ============================================

export async function listWebhookDeliveries(
  supabase: SupabaseClient,
  organizationId: string,
  endpointId: string,
  opts: { status?: string; limit?: number } = {}
) {
  let query = supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_endpoint_id', endpointId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}