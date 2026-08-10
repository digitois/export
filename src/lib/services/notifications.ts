import type { SupabaseClient } from '@supabase/supabase-js';

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  return { items: data ?? [], error };
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { count: count ?? 0, error };
}

export async function markRead(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);
  return { error };
}

export async function markAllRead(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { error };
}

/** Insert a notification for every member of an organization (best-effort). */
export async function notifyOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    type: 'lead_new' | 'lead_update' | 'quotation' | 'invoice' | 'payment' | 'email' | 'blog' | 'system' | 'support';
    title: string;
    body?: string | null;
    data?: Record<string, unknown>;
  }
) {
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (!members || members.length === 0) return { error: null };

  const { error } = await supabase.from('notifications').insert(
    members.map((m) => ({
      organization_id: organizationId,
      user_id: m.user_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {}
    }))
  );

  return { error };
}
