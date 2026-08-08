import type { SupabaseClient } from '@supabase/supabase-js';

export async function listOrganizations(supabase: SupabaseClient, opts: { page: number; pageSize: number; q?: string }) {
  let query = supabase
    .from('organizations')
    .select('*, plans(name, code), subscriptions(status)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.q) query = query.or(`name.ilike.%${opts.q}%,slug.ilike.%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getOrganizationDetail(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from('organizations')
    .select('*, plans(*), subscriptions(*), organization_members(id, role, status, profiles(id, full_name, email))')
    .eq('id', id)
    .single();
  return data;
}

export async function setOrganizationStatus(supabase: SupabaseClient, id: string, status: string) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function listUsers(supabase: SupabaseClient, opts: { page: number; pageSize: number; q?: string }) {
  let query = supabase
    .from('profiles')
    .select('*, organizations:organization_members(role, organizations(name))', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.q) query = query.or(`full_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function listPayments(supabase: SupabaseClient, opts: { page: number; pageSize: number }) {
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await supabase
    .from('payments')
    .select('*, organizations(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function listSupportTickets(supabase: SupabaseClient, opts: { page: number; pageSize: number; status?: string }) {
  let query = supabase
    .from('support_tickets')
    .select('*, profiles(full_name, email), organizations(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getTicket(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from('support_tickets')
    .select('*, profiles(full_name, email), organizations(name), support_messages(*, profiles(full_name, email))')
    .eq('id', id)
    .single();
  return data;
}

export async function setTicketStatus(supabase: SupabaseClient, id: string, status: string) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status, resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function replyToTicket(supabase: SupabaseClient, ticketId: string, userId: string, body: string, isStaff: boolean) {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticketId, user_id: userId, body, is_staff: isStaff })
    .select()
    .single();
  if (!error) {
    await supabase.from('support_tickets').update({ status: isStaff ? 'pending' : 'open' }).eq('id', ticketId);
  }
  return { data, error };
}

export async function listSystemLogs(supabase: SupabaseClient, opts: { page: number; pageSize: number }) {
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await supabase
    .from('audit_logs')
    .select('*, organizations(name), profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function listPlans(supabase: SupabaseClient) {
  const { data } = await supabase.from('plans').select('*').order('sort_order');
  return data ?? [];
}

export async function createPlan(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('plans').insert(payload).select().single();
  return { data, error };
}

export async function updatePlan(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('plans').update(payload).eq('id', id).select().single();
  return { data, error };
}

export async function setFeatureFlag(supabase: SupabaseClient, key: string, enabled: boolean) {
  const { data, error } = await supabase
    .from('feature_flags')
    .upsert({ key, enabled }, { onConflict: 'key' })
    .select()
    .single();
  return { data, error };
}

export async function listAnnouncements(supabase: SupabaseClient) {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function createAnnouncement(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('announcements').insert(payload).select().single();
  return { data, error };
}

export async function getUsageSnapshot(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase.rpc('organization_usage', { p_org_id: organizationId });
  return { data: (data as Record<string, number> | null) ?? null, error };
}
