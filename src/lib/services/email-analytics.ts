import type { SupabaseClient } from '@supabase/supabase-js';

export interface SequencePerformance {
  id: string;
  name: string;
  is_active: boolean;
  enrolled: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  replied: number;
  completed: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  created_at: string;
}

export interface SenderHealth {
  id: string;
  email: string;
  provider: 'ses' | 'gmail';
  is_active: boolean;
  is_verified: boolean;
  sent_today: number;
  daily_send_limit: number;
  bounce_rate: number;
  complaint_rate: number;
  open_rate: number;
  click_rate: number;
  sent_30d: number;
}

export interface VariantPerformance {
  id: string;
  name: string;
  is_variant: boolean;
  parent_template_id?: string | null;
  category?: string | null;
  usage_count: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
}

export interface EmailAnalytics {
  overview: {
    totalSent: number;
    uniqueDelivered: number;
    uniqueOpened: number;
    uniqueClicked: number;
    totalBounced: number;
    totalComplained: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
    sequences: {
      total: number;
      active: number;
      enrolled: number;
      completed: number;
    };
    verifiedContacts: number;
    invalidContacts: number;
  };
  sequences: SequencePerformance[];
  senders: SenderHealth[];
  variants: VariantPerformance[];
  trend: { date: string; sent: number; opened: number; clicked: number }[];
}

export async function getEmailAnalytics(
  supabase: SupabaseClient,
  organizationId: string,
  days = 30
): Promise<EmailAnalytics> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [seqRes, senderRes, variantRes, activities, trendRes, statsRes, verifyRes] = await Promise.all([
    getSequencePerformance(supabase, organizationId, since),
    getSenderHealth(supabase, organizationId, since),
    getVariantPerformance(supabase, organizationId, since),
    getActivities(supabase, organizationId, since),
    getTrend(supabase, organizationId, since),
    getVerificationStats(supabase, organizationId),
    getVerificationTotals(supabase, organizationId)
  ]);

  const sent = activities.sent;
  const delivered = activities.delivered;
  const opened = activities.opened;
  const clicked = activities.clicked;
  const bounced = activities.bounced;
  const complained = activities.complained;
  const unsubscribed = activities.unsubscribed;

  return {
    overview: {
      totalSent: sent,
      uniqueDelivered: delivered,
      uniqueOpened: opened,
      uniqueClicked: clicked,
      totalBounced: bounced,
      totalComplained: complained,
      totalUnsubscribed: unsubscribed,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
      clickRate: delivered > 0 ? Math.round((clicked / delivered) * 10000) / 100 : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 10000) / 100 : 0,
      complaintRate: sent > 0 ? Math.round((complained / sent) * 10000) / 100 : 0,
      sequences: {
        total: seqRes.total,
        active: seqRes.active,
        enrolled: seqRes.enrolled,
        completed: seqRes.completed
      },
      verifiedContacts: verifyRes.verified ?? 0,
      invalidContacts: verifyRes.invalid ?? 0
    },
    sequences: seqRes.sequences,
    senders: senderRes,
    variants: variantRes,
    trend: trendRes
  };
}

async function getActivities(supabase: SupabaseClient, organizationId: string, since: string) {
  const { data, error } = await supabase
    .from('email_activities')
    .select('event')
    .eq('organization_id', organizationId)
    .gte('occurred_at', since);

  if (error || !data) {
    return { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0 };
  }

  const count = (ev: string) => data.filter((r) => r.event === ev).length;
  return {
    sent: count('sent'),
    delivered: count('delivered'),
    opened: count('opened'),
    clicked: count('clicked'),
    bounced: count('bounced'),
    complained: count('complained'),
    unsubscribed: count('unsubscribed')
  };
}

async function getSequencePerformance(supabase: SupabaseClient, organizationId: string, since: string) {
  const [sequences, enrollments, activities] = await Promise.all([
    supabase.from('sequences').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50),
    supabase.from('sequence_enrollments').select('sequence_id, status').eq('status', 'completed'),
    getActivitiesBySequence(supabase, organizationId, since)
  ]);

  const seqData = sequences.data ?? [];
  const enrolledCount: Record<string, number> = {};
  const completedCount: Record<string, number> = {};
  for (const e of enrollments.data ?? []) {
    enrolledCount[e.sequence_id] = (enrolledCount[e.sequence_id] ?? 0) + 1;
    if (e.status === 'completed') completedCount[e.sequence_id] = (completedCount[e.sequence_id] ?? 0) + 1;
  }

  const list: SequencePerformance[] = seqData.map((s) => {
    const a = activities[s.id] ?? {};
    const delivered = a.delivered ?? 0;
    const opened = a.opened ?? 0;
    const clicked = a.clicked ?? 0;
    return {
      id: s.id,
      name: s.name,
      is_active: s.is_active,
      enrolled: enrolledCount[s.id] ?? s.enrolled_count ?? 0,
      sent: a.sent ?? 0,
      delivered,
      opened,
      clicked,
      bounced: a.bounced ?? 0,
      replied: a.replied ?? 0,
      completed: completedCount[s.id] ?? 0,
      open_rate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
      click_rate: delivered > 0 ? Math.round((clicked / delivered) * 10000) / 100 : 0,
      reply_rate: delivered > 0 ? Math.round(((a.replied ?? 0) / delivered) * 10000) / 100 : 0,
      created_at: s.created_at
    };
  });

  return {
    total: seqData.length,
    active: seqData.filter((s) => s.is_active).length,
    enrolled: Object.values(enrolledCount).reduce((a, b) => a + b, 0),
    completed: Object.values(completedCount).reduce((a, b) => a + b, 0),
    sequences: list
  };
}

async function getActivitiesBySequence(supabase: SupabaseClient, organizationId: string, since: string): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await supabase
    .from('email_activities')
    .select('sequence_id, event')
    .eq('organization_id', organizationId)
    .not('sequence_id', 'is', null)
    .gte('occurred_at', since)
    .limit(5000);

  const result: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!row.sequence_id) continue;
    const seq = result[row.sequence_id] ?? (result[row.sequence_id] = {});
    seq[row.event] = (seq[row.event] ?? 0) + 1;
  }
  return result;
}

async function getSenderHealth(supabase: SupabaseClient, organizationId: string, since: string): Promise<SenderHealth[]> {
  const [senders, usage] = await Promise.all([
    supabase.from('sender_accounts').select('*').eq('organization_id', organizationId).order('email'),
    supabase
      .from('sender_account_usage')
      .select('sender_account_id, sent_count, bounced_count, complained_count')
      .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  ]);

  const usageByAccount: Record<string, { sent: number; bounced: number; complained: number }> = {};
  for (const u of usage.data ?? []) {
    const acc = usageByAccount[u.sender_account_id] ?? (usageByAccount[u.sender_account_id] = { sent: 0, bounced: 0, complained: 0 });
    acc.sent += u.sent_count ?? 0;
    acc.bounced += u.bounced_count ?? 0;
    acc.complained += u.complained_count ?? 0;
  }

  const activities = await getActivitiesBySender(supabase, organizationId, since);

  return (senders.data ?? []).map((s) => {
    const a = activities[s.email] ?? {};
    const sent30 = usageByAccount[s.id]?.sent ?? 0;
    const delivered = a.delivered ?? 0;
    const opened = a.opened ?? 0;
    const clicked = a.clicked ?? 0;
    return {
      id: s.id,
      email: s.email,
      provider: s.provider,
      is_active: s.is_active,
      is_verified: s.is_verified,
      sent_today: s.sent_today ?? 0,
      daily_send_limit: s.daily_send_limit ?? 1000,
      bounce_rate: Math.round((s.bounce_rate ?? 0) * 10000) / 100,
      complaint_rate: Math.round((s.complaint_rate ?? 0) * 10000) / 100,
      open_rate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
      click_rate: delivered > 0 ? Math.round((clicked / delivered) * 10000) / 100 : 0,
      sent_30d: sent30
    };
  });
}

async function getActivitiesBySender(supabase: SupabaseClient, organizationId: string, since: string): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await supabase
    .from('email_activities')
    .select('sender_accounts(email), event')
    .eq('organization_id', organizationId)
    .not('sender_account_id', 'is', null)
    .gte('occurred_at', since)
    .limit(5000);

  const result: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const senderArr = row.sender_accounts as { email: string }[] | { email: string } | undefined;
    const email = Array.isArray(senderArr) ? senderArr[0]?.email : senderArr?.email;
    if (!email) continue;
    const acc = result[email] ?? (result[email] = {});
    acc[row.event] = (acc[row.event] ?? 0) + 1;
  }
  return result;
}

async function getVariantPerformance(supabase: SupabaseClient, organizationId: string, since: string): Promise<VariantPerformance[]> {
  const [templates, activities] = await Promise.all([
    supabase
      .from('email_templates')
      .select('id, name, is_variant, parent_template_id, category, usage_count')
      .eq('organization_id', organizationId)
      .limit(200),
    supabase
      .from('email_activities')
      .select('template_id, event')
      .eq('organization_id', organizationId)
      .not('template_id', 'is', null)
      .gte('occurred_at', since)
      .limit(5000)
  ]);

  const counts: Record<string, Record<string, number>> = {};
  for (const row of activities.data ?? []) {
    if (!row.template_id) continue;
    const t = counts[row.template_id] ?? (counts[row.template_id] = {});
    t[row.event] = (t[row.event] ?? 0) + 1;
  }

  const byId = new Map((templates.data ?? []).map((t) => [t.id, t]));

  return (templates.data ?? [])
    .filter((t) => t.is_variant || (t.parent_template_id ?? null) !== null)
    .concat(
      (templates.data ?? [])
        .filter((t) => counts[t.id] && !t.is_variant && (t.parent_template_id ?? null) === null)
        .slice(0, 20)
    )
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .map((t) => {
      const a = counts[t.id] ?? {};
      const delivered = a.delivered ?? 0;
      const opened = a.opened ?? 0;
      const clicked = a.clicked ?? 0;
      return {
        id: t.id,
        name: t.name,
        is_variant: t.is_variant,
        parent_template_id: t.parent_template_id,
        category: t.category,
        usage_count: t.usage_count ?? 0,
        sent: a.sent ?? 0,
        opened,
        clicked,
        bounced: a.bounced ?? 0,
        open_rate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
        click_rate: delivered > 0 ? Math.round((clicked / delivered) * 10000) / 100 : 0
      };
    })
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 30);
}

async function getTrend(
  supabase: SupabaseClient,
  organizationId: string,
  since: string
): Promise<{ date: string; sent: number; opened: number; clicked: number }[]> {
  const { data, error } = await supabase
    .from('email_activities')
    .select('event, occurred_at')
    .eq('organization_id', organizationId)
    .gte('occurred_at', since)
    .limit(20000);

  const buckets = new Map<string, { date: string; sent: number; opened: number; clicked: number; delivered: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, sent: 0, opened: 0, clicked: 0, delivered: 0 });
  }

  for (const row of data ?? []) {
    const key = String(row.occurred_at).slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (row.event === 'sent') b.sent++;
    else if (row.event === 'opened') b.opened++;
    else if (row.event === 'clicked') b.clicked++;
    else if (row.event === 'delivered') b.delivered++;
  }

  return [...buckets.values()].map(({ date, sent, opened, clicked }) => ({ date, sent, opened, clicked }));
}

async function getVerificationStats(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('email_contacts')
    .select('verification_status')
    .eq('organization_id', organizationId);

  let verified = 0;
  let invalid = 0;
  for (const row of data ?? []) {
    if (row.verification_status === 'valid') verified++;
    else if (row.verification_status === 'invalid') invalid++;
  }
  return { verified, invalid };
}

async function getVerificationTotals(supabase: SupabaseClient, organizationId: string) {
  return getVerificationStats(supabase, organizationId);
}