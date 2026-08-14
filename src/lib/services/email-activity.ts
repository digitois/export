import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
export type EmailBounceType = 'hard' | 'soft' | 'transient';

export interface LogEmailActivityInput {
  organization_id: string;
  sender_account_id?: string;
  contact_id?: string;
  lead_id?: string;
  email: string;
  event: EmailEventType;
  message_id?: string;
  template_id?: string;
  campaign_id?: string;
  sequence_id?: string;
  sequence_enrollment_id?: string;
  bounce_type?: EmailBounceType;
  bounce_subtype?: string;
  bounce_diagnostic?: string;
  click_url?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailActivityFilters {
  organization_id: string;
  event?: EmailEventType;
  contact_id?: string;
  template_id?: string;
  campaign_id?: string;
  sequence_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ContactTimelineItem {
  id: string;
  event: EmailEventType;
  email: string;
  subject?: string;
  template_name?: string;
  campaign_name?: string;
  sequence_name?: string;
  click_url?: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface ActivityStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

// ============================================
// LOGGING
// ============================================

export async function logEmailActivity(
  supabase: SupabaseClient,
  input: LogEmailActivityInput
) {
  const { data, error } = await supabase
    .from('email_activities')
    .insert(input)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  // Update sender account usage
  if (input.sender_account_id) {
    await supabase.rpc('record_sender_account_usage', { 
      p_sender_account_id: input.sender_account_id, 
      p_event: input.event 
    });
  }

  // Handle suppressions
  if (['bounced', 'complained', 'unsubscribed'].includes(input.event)) {
    await supabase
      .from('email_suppressions')
      .upsert({
        organization_id: input.organization_id,
        email: input.email,
        reason: input.event,
        source_email_activity_id: data.id
      }, { onConflict: 'organization_id, email, reason' })
      .select();
  }

  // Update verification stats on bounce
  if (input.event === 'bounced') {
    await supabase.rpc('update_verification_stats', { p_organization_id: input.organization_id });
  }

  return { data, error: undefined };
}

export async function getActivityLog(supabase: SupabaseClient, filters: EmailActivityFilters) {
  let query = supabase
    .from('email_activities')
    .select(`
      *,
      email_templates!inner(name),
      email_campaigns!inner(name),
      sequences!inner(name)
    `)
    .eq('organization_id', filters.organization_id)
    .order('occurred_at', { ascending: false });

  if (filters.event) query = query.eq('event', filters.event);
  if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
  if (filters.template_id) query = query.eq('template_id', filters.template_id);
  if (filters.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
  if (filters.sequence_id) query = query.eq('sequence_id', filters.sequence_id);
  if (filters.date_from) query = query.gte('occurred_at', filters.date_from);
  if (filters.date_to) query = query.lte('occurred_at', filters.date_to);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: new Error(error.message) };

  return { data: data ?? [], count: count ?? 0, error: undefined };
}

export async function getContactTimeline(supabase: SupabaseClient, organizationId: string, contactId: string, limit = 50): Promise<{ data: ContactTimelineItem[]; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('email_activities')
    .select(`
      id, event, email, click_url, metadata, occurred_at,
      email_templates!inner(name),
      email_campaigns!inner(name),
      sequences!inner(name)
    `)
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: new Error(error.message) };

  const timeline: ContactTimelineItem[] = (data ?? []).map(row => {
    const templates = row.email_templates as { name: string }[] | undefined;
    const campaigns = row.email_campaigns as { name: string }[] | undefined;
    const sequences = row.sequences as { name: string }[] | undefined;

    return {
      id: row.id,
      event: row.event,
      email: row.email,
      subject: row.metadata?.subject as string | undefined,
      template_name: templates?.[0]?.name,
      campaign_name: campaigns?.[0]?.name,
      sequence_name: sequences?.[0]?.name,
      click_url: row.click_url,
      metadata: row.metadata ?? {},
      occurred_at: row.occurred_at
    };
  });

  return { data: timeline, error: undefined };
}

export async function getActivityStats(supabase: SupabaseClient, organizationId: string, dateFrom?: string, dateTo?: string): Promise<{ data: ActivityStats | null; error: Error | undefined }> {
  let query = supabase
    .from('email_activities')
    .select('event')
    .eq('organization_id', organizationId);

  if (dateFrom) query = query.gte('occurred_at', dateFrom);
  if (dateTo) query = query.lte('occurred_at', dateTo);

  const { data, error } = await query;
  if (error) return { data: null, error: new Error(error.message) };

  const stats = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0
  };

  for (const row of data ?? []) {
    if (row.event in stats) {
      stats[row.event as keyof typeof stats]++;
    }
  }

  const delivered = stats.delivered || stats.sent;
  const openRate = delivered > 0 ? (stats.opened / delivered * 100) : 0;
  const clickRate = delivered > 0 ? (stats.clicked / delivered * 100) : 0;
  const bounceRate = stats.sent > 0 ? (stats.bounced / stats.sent * 100) : 0;
  const complaintRate = stats.sent > 0 ? (stats.complained / stats.sent * 100) : 0;

  return { 
    data: { 
      ...stats, 
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      complaintRate: Math.round(complaintRate * 100) / 100
    }, 
    error: undefined 
  };
}

export async function checkSuppression(supabase: SupabaseClient, organizationId: string, email: string): Promise<{ data: boolean; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('email_suppressions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: false, error: new Error(error.message) };
  }

  return { data: !!data, error: undefined };
}