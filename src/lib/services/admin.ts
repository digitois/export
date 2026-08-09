import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject } from '@/lib/utils';

export function planPayloadToSnake(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return camelToSnakeObject(out);
}

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

export async function listFeatureFlags(supabase: SupabaseClient) {
  const { data } = await supabase.from('feature_flags').select('*').order('updated_at', { ascending: false });
  return data ?? [];
}

export async function upsertFeatureFlag(
  supabase: SupabaseClient,
  payload: { key: string; enabled: boolean; description?: string | null }
) {
  const { data, error } = await supabase
    .from('feature_flags')
    .upsert({ key: payload.key, enabled: payload.enabled, description: payload.description ?? undefined }, { onConflict: 'key' })
    .select()
    .single();
  return { data, error };
}

export async function deletePlan(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  return { error };
}

export async function updateAnnouncement(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('announcements').update(payload).eq('id', id).select().single();
  return { data, error };
}

export async function deleteAnnouncement(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  return { error };
}

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  opts: { statuses?: string[]; createdSince?: Date } = {}
) {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (opts.statuses && opts.statuses.length > 0) query = query.in('status', opts.statuses);
    if (opts.createdSince) query = query.gte('created_at', opts.createdSince.toISOString());
    const { count } = await query;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getAdminOverview(supabase: SupabaseClient) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const recentOrganizations = await (async () => {
    try {
      const { data } = await supabase
        .from('organizations')
        .select('*, plans(name, code)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    } catch {
      return [];
    }
  })();

  const recentTickets = await (async () => {
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('*, profiles(full_name, email), organizations(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    } catch {
      return [];
    }
  })();

  const mrr = await (async () => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('billing_cycle, plans(price_monthly, price_annual)')
        .eq('status', 'active');
      const total = (data ?? []).reduce((sum: number, sub: Record<string, unknown>) => {
        const s = sub as unknown as {
          billing_cycle?: string | null;
          plans?: { price_monthly?: number | string | null; price_annual?: number | string | null } | null;
        };
        const plan = s.plans;
        if (!plan) return sum;
        if (s.billing_cycle === 'annual') return sum + Number(plan.price_annual ?? 0) / 12;
        return sum + Number(plan.price_monthly ?? plan.price_annual ?? 0);
      }, 0);
      return Math.round(total * 100) / 100;
    } catch {
      return 0;
    }
  })();

  const [organizations, users, payments, activeSubscriptions, openTickets, newSignupsThisMonth] =
    await Promise.all([
      safeCount(supabase, 'organizations'),
      safeCount(supabase, 'profiles'),
      safeCount(supabase, 'payments'),
      safeCount(supabase, 'subscriptions', { statuses: ['active'] }),
      safeCount(supabase, 'support_tickets', { statuses: ['open', 'pending'] }),
      safeCount(supabase, 'organizations', { createdSince: monthStart })
    ]);

  return {
    organizations,
    users,
    mrr,
    activeSubscriptions,
    payments,
    openTickets,
    newSignupsThisMonth,
    recentOrganizations,
    recentTickets
  };
}
