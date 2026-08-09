import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { contractSchema } from '@/lib/validations';

export type ContractInput = z.infer<typeof contractSchema>;

const CONTRACT_SELECT = '*, lead:leads(id, buyer_name, company_name)';

export async function listContracts(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; leadId?: string; status?: string;
}) {
  let query = supabase
    .from('contracts')
    .select(CONTRACT_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.leadId) query = query.eq('lead_id', opts.leadId);
  if (opts.status) query = query.eq('status', opts.status);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getContract(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createContract(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: ContractInput
) {
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      organization_id: organizationId,
      lead_id: input.leadId ?? null,
      title: input.title,
      document_url: input.documentUrl ?? null,
      status: input.status,
      signed_at: input.signedAt ?? null,
      expires_at: input.expiresAt ?? null,
      value: input.value ?? null,
      currency: input.currency,
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateContract(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: ContractInput
) {
  const { data, error } = await supabase
    .from('contracts')
    .update({
      lead_id: input.leadId ?? null,
      title: input.title,
      document_url: input.documentUrl ?? null,
      status: input.status,
      signed_at: input.signedAt ?? null,
      expires_at: input.expiresAt ?? null,
      value: input.value ?? null,
      currency: input.currency,
      notes: input.notes ?? null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function signContract(
  supabase: SupabaseClient,
  organizationId: string,
  id: string
) {
  const { data, error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteContract(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}