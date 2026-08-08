import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, isSesConfigured, emailLayout } from '@/lib/email';
import { renderTemplate } from '@/lib/services/email';

export interface WorkflowTriggerEvent {
  trigger: 'lead_created' | 'lead_status_changed' | 'inquiry_received';
  organizationId: string;
  lead?: {
    id: string;
    email?: string | null;
    name?: string | null;
    company?: string | null;
    country?: string | null;
    status?: string | null;
  };
}

interface WorkflowRow {
  id: string;
  organization_id: string;
  trigger_type: string;
  template_id: string | null;
  list_id: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

/**
 * Find all active workflows for an org + trigger and execute them,
 * best-effort. Adds the contact to the workflow list (if any) then
 * sends the template email (if any) with merge tags filled in.
 */
export async function runWorkflows(
  supabase: SupabaseClient,
  event: WorkflowTriggerEvent
): Promise<Array<{ workflowId: string; status: string; detail?: string }>> {
  const { data: workflows } = await supabase
    .from('email_workflows')
    .select('*')
    .eq('organization_id', event.organizationId)
    .eq('trigger_type', event.trigger)
    .eq('is_active', true);

  const results: Array<{ workflowId: string; status: string; detail?: string }> = [];

  for (const wf of (workflows as WorkflowRow[]) ?? []) {
    const match = matchesConditions(wf, event);
    if (!match.reason) {
      results.push({ workflowId: wf.id, status: 'skipped', detail: match.reason });
      continue;
    }

    try {
      let contactId: string | null = null;
      let finalStatus: 'matched' | 'sent' | 'skipped' = 'matched';

      if (wf.list_id && event.lead?.email) {
        const { data: contact } = await supabase
          .from('email_contacts')
          .upsert(
            {
              organization_id: event.organizationId,
              list_id: wf.list_id,
              email: event.lead.email.toLowerCase(),
              name: event.lead.name ?? null,
              company: event.lead.company ?? null,
              country: event.lead.country ?? null
            },
            { onConflict: 'organization_id,email' }
          )
          .select()
          .single();
        contactId = contact?.id ?? null;
      }

      if (wf.template_id && event.lead?.email) {
        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, body')
          .eq('id', wf.template_id)
          .single();

        if (!template || !isSesConfigured()) {
          finalStatus = 'skipped';
          const detail = !template ? 'Template not found' : 'Email provider not configured';
          results.push({ workflowId: wf.id, status: 'skipped', detail });
          await logRun(supabase, event, wf, event.lead?.id ?? null, contactId, 'skipped', detail);
          continue;
        }

        const html = renderTemplate(template.body, {
          name: event.lead.name ?? '',
          email: event.lead.email ?? '',
          company: event.lead.company ?? '',
          country: event.lead.country ?? ''
        });
        const res = await sendEmail({
          to: event.lead.email,
          subject: renderTemplate(template.subject, { name: event.lead.name ?? '' }),
          html
        });

        if (res.messageId) {
          finalStatus = 'sent';
          await supabase.from('email_activities').insert({
            organization_id: event.organizationId,
            contact_id: contactId,
            email: event.lead.email,
            event: 'sent'
          });
        } else {
          finalStatus = 'skipped';
        }
        results.push({ workflowId: wf.id, status: finalStatus, detail: res.error });
      } else {
        results.push({ workflowId: wf.id, status: finalStatus, detail: 'list add only' });
      }

      await logRun(supabase, event, wf, event.lead?.id ?? null, contactId, finalStatus, match.reason);
      await supabase.rpc('run_workflow_increment', { p_workflow_id: wf.id });
    } catch (err) {
      results.push({ workflowId: wf.id, status: 'skipped', detail: err instanceof Error ? err.message : 'error' });
    }
  }

  return results;
}

function matchesConditions(wf: WorkflowRow, event: WorkflowTriggerEvent): { reason?: string } {
  const cfg = wf.config ?? {};
  const statuses = Array.isArray(cfg.statuses) ? cfg.statuses.flatMap((s) => String(s)) : [];

  if (wf.trigger_type === 'lead_created') {
    const filterStatus = cfg.status ?? null;
    if (filterStatus && event.lead?.status && event.lead.status !== filterStatus) {
      return { reason: `status ${event.lead.status} != ${filterStatus}` };
    }
  }

  if (wf.trigger_type === 'lead_status_changed') {
    if (statuses.length > 0 && event.lead?.status && !statuses.includes(event.lead.status)) {
      return { reason: `status ${event.lead.status} not in ${statuses.join(',')}` };
    }
  }

  if (wf.trigger_type === 'inquiry_received') {
    if (!event.lead?.email) return { reason: 'no buyer email' };
  }

  return {};
}

async function logRun(
  supabase: SupabaseClient,
  event: WorkflowTriggerEvent,
  wf: WorkflowRow,
  leadId: string | null,
  contactId: string | null,
  status: string,
  detail?: string
) {
  await supabase.from('email_workflow_runs').insert({
    organization_id: event.organizationId,
    workflow_id: wf.id,
    lead_id: leadId,
    contact_id: contactId,
    email: event.lead?.email ?? null,
    status,
    detail: detail ?? null
  });
}

export async function listWorkflows(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('email_workflows')
    .select('*, template:email_templates(name), list:contact_lists(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getWorkflowRuns(supabase: SupabaseClient, organizationId: string, workflowId?: string) {
  let query = supabase
    .from('email_workflow_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('ran_at', { ascending: false })
    .limit(100);
  if (workflowId) query = query.eq('workflow_id', workflowId);
  const { data } = await query;
  return data ?? [];
}