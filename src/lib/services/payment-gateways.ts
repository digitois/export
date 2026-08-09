import type { SupabaseClient } from '@supabase/supabase-js';
import type { GatewayCredentials, GatewayProvider } from '@/lib/payment-gateways';
import { GATEWAY_PROVIDERS } from '@/lib/payment-gateways';

export interface GatewayConfigInput {
  provider: GatewayProvider;
  enabled?: boolean;
  testMode?: boolean;
  config?: GatewayCredentials;
}

/** Returns the configured gateways for an org, defaulting empty rows per provider. */
export async function listGatewayConfigs(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) return { items: [], error };

  const byProvider = new Map((data ?? []).map((row) => [row.provider, row]));
  const items = GATEWAY_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (row) return row;
    return {
      id: null,
      organization_id: organizationId,
      provider,
      enabled: false,
      is_default: false,
      test_mode: true,
      config: {},
      created_at: null,
      updated_at: null
    };
  });

  return { items, error: null };
}

export async function saveGatewayConfig(
  supabase: SupabaseClient,
  organizationId: string,
  input: GatewayConfigInput
) {
  const { provider, enabled, testMode, config } = input;

  // When enabling a gateway, ensure it becomes the only default if it already is, or
  // leave default assignment to the caller. Keep it simple: if this is the first
  // enabled gateway, make it the default.
  const { data: existing } = await supabase
    .from('payment_gateways')
    .select('id, enabled, is_default, test_mode, config')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .single();

  let isDefault = existing?.is_default ?? false;
  if (enabled && !existing?.enabled) {
    const { count } = await supabase
      .from('payment_gateways')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('enabled', true);
    if ((count ?? 0) === 0) isDefault = true;
  }

  const upsertPayload = {
    organization_id: organizationId,
    provider,
    enabled: enabled ?? existing?.enabled ?? false,
    is_default: isDefault,
    test_mode: testMode ?? existing?.test_mode ?? true,
    config: config ?? existing?.config ?? {}
  };

  const { data, error } = await supabase
    .from('payment_gateways')
    .upsert(upsertPayload, { onConflict: 'organization_id,provider' })
    .select()
    .single();

  return { data, error };
}

export async function setDefaultGateway(
  supabase: SupabaseClient,
  organizationId: string,
  provider: GatewayProvider
) {
  // Clear existing defaults, then set the new one
  const { error: clearError } = await supabase
    .from('payment_gateways')
    .update({ is_default: false })
    .eq('organization_id', organizationId)
    .eq('is_default', true);

  if (clearError) return { data: null, error: clearError };

  const { data, error } = await supabase
    .from('payment_gateways')
    .update({ is_default: true, enabled: true })
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .select()
    .single();

  return { data, error };
}

export async function getDefaultGatewayConfig(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .order('is_default', { ascending: false })
    .limit(1)
    .single();

  return { data, error };
}

export async function getGatewayConfig(
  supabase: SupabaseClient,
  organizationId: string,
  provider: GatewayProvider
) {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .single();
  return { data, error };
}
