import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export async function listCampaigns(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('email_campaigns')
    .select('*, list:contact_lists(name), template:email_templates(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listContactLists(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('contact_lists')
    .select('*, contacts:email_contacts(count)')
    .eq('organization_id', organizationId)
    .order('name');
  return (data ?? []).map((row) => {
    const r = row as {
      id: string; name: string; description: string | null;
      created_at: string; contact_count?: number;
      contacts?: Array<{ count: number }>;
    };
    const liveCount = r.contacts?.[0]?.count ?? 0;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      created_at: r.created_at,
      contact_count: liveCount || r.contact_count || 0
    };
  });
}

export async function createContactList(supabase: SupabaseClient, organizationId: string, userId: string, name: string, description?: string) {
  const { data, error } = await supabase
    .from('contact_lists')
    .insert({ organization_id: organizationId, name, description, created_by: userId })
    .select()
    .single();
  return { data, error };
}

export async function listContacts(supabase: SupabaseClient, organizationId: string, listId?: string) {
  let query = supabase
    .from('email_contacts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (listId) query = query.eq('list_id', listId);
  const { data } = await query;
  return data ?? [];
}

export async function addContacts(supabase: SupabaseClient, organizationId: string, contacts: Array<Record<string, unknown>>) {
  const rows = contacts.map((c) => ({ ...c, organization_id: organizationId }));
  const { data, error } = await supabase.from('email_contacts').upsert(rows, {
    onConflict: 'organization_id,email',
    ignoreDuplicates: false
  }).select();
  return { data, error };
}

export async function listTemplates(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  return data ?? [];
}

export async function createTemplate(supabase: SupabaseClient, organizationId: string, userId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('email_templates')
    .insert({ ...payload, organization_id: organizationId, created_by: userId })
    .select()
    .single();
  return { data, error };
}

export async function createCampaign(supabase: SupabaseClient, organizationId: string, userId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({ ...payload, organization_id: organizationId, created_by: userId, status: 'draft' })
    .select()
    .single();
  return { data, error };
}

export async function scheduleCampaign(supabase: SupabaseClient, organizationId: string, id: string, scheduledAt: string) {
  const { data, error } = await supabase
    .from('email_campaigns')
    .update({ scheduled_at: scheduledAt, status: 'scheduled' })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function sendCampaign(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();

  if (!campaign) return { error: new Error('Campaign not found') };
  if (campaign.status === 'sending') return { error: new Error('Campaign is already sending') };

  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', sent_at: new Date().toISOString() })
    .eq('id', id);

  let query = supabase
    .from('email_contacts')
    .select('id, email, name')
    .eq('organization_id', organizationId)
    .eq('unsubscribed', false);

  if (campaign.list_id) query = query.eq('list_id', campaign.list_id);

  const { data: contacts } = await query;
  const list = contacts ?? [];

  // Load B variant if this is an A/B campaign
  let variant: { subject: string; body: string } | null = null;
  if (campaign.variant_template_id) {
    const { data: v } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('id', campaign.variant_template_id)
      .eq('organization_id', organizationId)
      .single();
    if (v) variant = v;
  }

  const splitPercent = campaign.variant_split_percent ?? 50;
  let sent = 0;
  for (let i = 0; i < list.length; i++) {
    const contact = list[i];
    // Even-indexed contacts past the split threshold get the B variant
    const useVariant = variant && (i % 100 >= splitPercent);

    const res = await sendEmail({
      to: contact.email,
      subject: useVariant ? variant!.subject : campaign.subject,
      html: renderTemplate(useVariant ? variant!.body : campaign.body, { name: contact.name ?? '', email: contact.email })
    });
    if (res.messageId) {
      sent++;
      await supabase.from('email_activities').insert({
        organization_id: organizationId,
        campaign_id: id,
        contact_id: contact.id,
        email: contact.email,
        event: 'sent',
        template_id: useVariant ? campaign.variant_template_id : (campaign.template_id ?? null)
      });
    }
  }

  await supabase
    .from('email_campaigns')
    .update({ status: 'sent', sent_count: sent, recipients_count: list.length })
    .eq('id', id);

  await supabase
    .from('email_usage')
    .upsert({ organization_id: organizationId, month: new Date().toISOString().slice(0, 7), emails_sent: sent }, {
      onConflict: 'organization_id,month'
    });

  return { error: null, sent };
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

export async function trackEvent(
  supabase: SupabaseClient,
  organizationId: string,
  input: { campaignId: string; email?: string; event: string; url?: string }
) {
  const { data, error } = await supabase
    .from('email_activities')
    .insert({ organization_id: organizationId, campaign_id: input.campaignId, email: input.email, event: input.event, url: input.url })
    .select()
    .single();

  if (!error) {
    const col =
      input.event === 'opened' ? 'opened_count' :
      input.event === 'clicked' ? 'clicked_count' :
      input.event === 'unsubscribed' ? 'unsubscribed_count' : null;
    if (col) {
      const { error: rpcError } = await supabase.rpc('increment_campaign_counter', { p_campaign_id: input.campaignId, p_column: col });
      void rpcError;
    }
    if (input.event === 'unsubscribed' && input.email) {
      await supabase.from('email_contacts').update({ unsubscribed: true }).eq('email', input.email).eq('organization_id', organizationId);
    }
  }
  return { data, error };
}
