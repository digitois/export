import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject } from '@/lib/utils';

export interface LeadListOptions {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
  priority?: string;
  source?: string;
  assignedTo?: string;
}

const LEAD_SELECT =
  '*, assigned_to:profiles!leads_assigned_to_fkey(full_name, email), created_by:profiles!leads_created_by_fkey(full_name, email)';

export async function listLeads(supabase: SupabaseClient, organizationId: string, opts: LeadListOptions) {
  let query = supabase
    .from('leads')
    .select(LEAD_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.priority) query = query.eq('priority', opts.priority);
  if (opts.source) query = query.eq('source', opts.source);
  if (opts.assignedTo) query = query.eq('assigned_to', opts.assignedTo);
  if (opts.q) {
    query = query.or(`buyer_name.ilike.%${opts.q}%,company_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);

  return { items: data ?? [], count: count ?? 0 };
}

export async function getLead(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createLead(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...camelToSnakeObject(payload), organization_id: organizationId, created_by: userId })
    .select()
    .single();
  return { data, error };
}

export async function updateLead(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('leads')
    .update(camelToSnakeObject(payload))
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function updateLeadStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: string
) {
  const patch: Record<string, unknown> = { status };
  if (status === 'won') patch.won_at = new Date().toISOString();
  if (status === 'lost') patch.lost_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteLead(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

export async function listLeadActivities(supabase: SupabaseClient, organizationId: string, leadId: string) {
  const { data } = await supabase
    .from('lead_activities')
    .select('*, user_id:profiles(full_name, email)')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createLeadActivity(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  payload: { leadId: string; type: string; description: string; dueAt?: string | null }
) {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({
      organization_id: organizationId,
      lead_id: payload.leadId,
      user_id: userId,
      type: payload.type,
      description: payload.description,
      due_at: payload.dueAt ?? null
    })
    .select()
    .single();
  return { data, error };
}

export async function getLeadStats(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('leads')
    .select('status, count', { count: 'exact', head: false })
    .eq('organization_id', organizationId);
  const counts: Record<string, number> = {};
  for (const s of ['new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won', 'lost']) {
    counts[s] = 0;
  }
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  (data ?? []).forEach((row) => {
    counts[(row as { status: string }).status] = (counts[(row as { status: string }).status] ?? 0) + 1;
  });
  return { byStatus: counts, total: count ?? 0 };
}
