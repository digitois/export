import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { followUpSchema } from '@/lib/validations';

export type FollowUpInput = z.infer<typeof followUpSchema>;

const FOLLOW_UP_SELECT = '*, lead:leads(id, buyer_name, company_name, email, stage_id, status)';

export async function listFollowUps(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; leadId?: string; done?: boolean; upcoming?: boolean;
}) {
  let query = supabase
    .from('lead_follow_ups')
    .select(FOLLOW_UP_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('scheduled_at', { ascending: true });

  if (opts.leadId) query = query.eq('lead_id', opts.leadId);
  if (opts.done !== undefined) query = query.eq('done', opts.done);
  if (opts.upcoming) {
    const now = new Date().toISOString();
    query = query.gte('scheduled_at', now).eq('done', false);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getFollowUp(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('lead_follow_ups')
    .select(FOLLOW_UP_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createFollowUp(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: FollowUpInput
) {
  const { data, error } = await supabase
    .from('lead_follow_ups')
    .insert({
      organization_id: organizationId,
      lead_id: input.leadId,
      scheduled_at: input.scheduledAt,
      reminder_type: input.reminderType,
      note: input.note ?? null,
      notification_channels: input.notificationChannels,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateFollowUp(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: FollowUpInput
) {
  const { data, error } = await supabase
    .from('lead_follow_ups')
    .update({
      lead_id: input.leadId,
      scheduled_at: input.scheduledAt,
      reminder_type: input.reminderType,
      note: input.note ?? null,
      notification_channels: input.notificationChannels
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function markFollowUpDone(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  done: boolean
) {
  const { data, error } = await supabase
    .from('lead_follow_ups')
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteFollowUp(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('lead_follow_ups')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}