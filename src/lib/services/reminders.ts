import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { reminderSchema } from '@/lib/validations';

export type ReminderInput = z.infer<typeof reminderSchema>;

const REMINDER_SELECT = '*, lead:leads(id, buyer_name, company_name, stage_id), follow_up:lead_follow_ups(id, scheduled_at, note)';

export async function listReminders(supabase: SupabaseClient, userId: string, opts: {
  page: number; pageSize: number; unreadOnly?: boolean; upcomingOnly?: boolean;
}) {
  let query = supabase
    .from('reminders')
    .select(REMINDER_SELECT, { count: 'exact' })
    .eq('user_id', userId)
    .order('remind_at', { ascending: true });

  if (opts.unreadOnly) query = query.eq('is_read', false).eq('is_dismissed', false);
  if (opts.upcomingOnly) query = query.gte('remind_at', new Date().toISOString());

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getReminder(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from('reminders')
    .select(REMINDER_SELECT)
    .eq('user_id', userId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createReminder(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: ReminderInput
) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      follow_up_id: input.followUpId ?? null,
      lead_id: input.leadId ?? null,
      title: input.title,
      description: input.description ?? null,
      remind_at: input.remindAt
    })
    .select()
    .single();
  return { data, error };
}

export async function markReminderRead(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from('reminders')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function dismissReminder(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from('reminders')
    .update({ is_dismissed: true })
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteReminder(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  return { error };
}

/** Create reminders for due follow-ups (call from cron or scheduled job) */
export async function createRemindersForDueFollowUps(supabase: SupabaseClient, organizationId: string) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h

  // Find follow-ups due in the next 24h that don't have reminders created
  const { data: followUps } = await supabase
    .from('lead_follow_ups')
    .select('id, lead_id, scheduled_at, note, notification_channels, created_by')
    .eq('organization_id', organizationId)
    .eq('done', false)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', windowEnd.toISOString());

  if (!followUps?.length) return { created: 0 };

  // For each follow-up, create reminders for assigned user(s)
  // Simple approach: create for the follow-up creator
  const reminders = followUps.map((fu) => ({
    organization_id: organizationId,
    user_id: fu.created_by,
    follow_up_id: fu.id,
    lead_id: fu.lead_id,
    title: `Follow-up due: ${fu.note ?? 'Check lead'}`,
    description: fu.note ?? null,
    remind_at: fu.scheduled_at
  }));

  const { data, error } = await supabase
    .from('reminders')
    .insert(reminders)
    .select();

  return { created: data?.length ?? 0, error };
}