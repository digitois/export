import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { processWebhookDeliveries } from '@/lib/services/webhooks';
import { renderSpintax } from '@/lib/services/contact-import';
import { renderTemplate } from '@/lib/services/templates';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    if (CRON_SECRET) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createServiceClient();

    const [sequenceResult, webhookResult, verificationResult] = await Promise.allSettled([
      runSequenceWorker(supabase),
      processWebhookDeliveries(supabase, BATCH_SIZE),
      runVerificationWorker(supabase)
    ]);

    return NextResponse.json({
      sequences: sequenceResult.status === 'fulfilled' ? sequenceResult.value : { error: String(sequenceResult.reason) },
      webhooks: webhookResult.status === 'fulfilled' ? webhookResult.value : { error: String(webhookResult.reason) },
      verification: verificationResult.status === 'fulfilled' ? verificationResult.value : { error: String(verificationResult.reason) }
    });
  } catch (err) {
    console.error('[cron] worker failed', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Worker failed' }, { status: 500 });
  }
}

// ============================================
// SEQUENCE RUNNER
// ============================================

async function runSequenceWorker(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  // Find active enrollments whose current step wait delay has elapsed
  const { data: enrollments, error } = await supabase
    .from('sequence_enrollments')
    .select(`
      id,
      sequence_id,
      contact_id,
      current_step_id,
      started_at,
      sequences!inner(id, is_active, name),
      email_contacts!inner(id, email, first_name, last_name, company, country, custom_fields)
    `)
    .eq('status', 'active')
    .limit(BATCH_SIZE);

  if (error || !enrollments?.length) return { processed: 0, sent: 0, advanced: 0 };

  let processed = 0;
  let sent = 0;
  let advanced = 0;

  for (const enrollmentRow of enrollments) {
    const enrollment = enrollmentRow as unknown as {
      id: string;
      sequence_id: string;
      contact_id: string;
      current_step_id: string | null;
      started_at: string;
      metadata: Record<string, unknown>;
      sequences: { id: string; is_active: boolean; name: string }[];
      email_contacts: { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; country: string | null; custom_fields: Record<string, unknown> | null }[];
    };
    const sequence = enrollment.sequences?.[0];
    const contact = enrollment.email_contacts?.[0];
    if (!sequence?.is_active || !contact) continue;

    const { data: currentStep } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('id', enrollment.current_step_id)
      .single();
    if (!currentStep) continue;

    // Determine when the current "step" started: if there is recorded progress in metadata
    const meta = (enrollment.metadata ?? {}) as Record<string, unknown>;
    const stepStartedAt = new Date((meta.step_started_at as string) ?? enrollment.started_at).getTime();
    const delayMs = delayToMs(currentStep.delay_value, currentStep.delay_unit);
    const readyAt = stepStartedAt + delayMs;

    // Only advance send_email or wait steps whose delay is complete (send_email has no delay)
    if (currentStep.type === 'wait' && Date.now() < readyAt) continue;

    // Get next step after current position
    const { data: nextStep } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .gt('position', currentStep.position)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (currentStep.type === 'send_email' && currentStep.template_id) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', currentStep.template_id)
        .single();

      if (template) {
        const firstName = contact?.first_name ?? '';
        const company = (contact?.company as string) ?? '';
        const vars: Record<string, string> = {
          name: contact?.email?.split('@')?.[0] ?? '',
          first_name: firstName,
          last_name: contact?.last_name ?? '',
          email: contact?.email ?? '',
          company,
          country: (contact?.country as string) ?? ''
        };

        const subject = renderSpintax(template.subject ?? '');
        const html = renderSpintax(template.body ?? '');
        const renderedHtml = renderTemplate(html, vars);

        const emailRes = await sendEmail({
          to: contact?.email ?? '',
          subject: renderTemplate(subject, vars),
          html: renderedHtml
        });

        if (!emailRes.error) sent++;
      }
    }

    // Record current step as started, then advance
    const updates: Record<string, unknown> = {
      metadata: {
        ...meta,
        last_step_id: enrollment.current_step_id,
        step_started_at: new Date().toISOString()
      }
    };

    if (nextStep) {
      updates.current_step_id = nextStep.id;
    } else {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    await supabase
      .from('sequence_enrollments')
      .update(updates)
      .eq('id', enrollment.id);

    await supabase.rpc('increment_sequence_counters', { p_sequence_id: enrollment.sequence_id });
    processed++;
    if (nextStep) advanced++;
  }

  return { processed, sent, advanced };
}

function delayToMs(value: number | null | undefined, unit: string | null | undefined): number {
  const v = value ?? 0;
  switch (unit) {
    case 'minutes': return v * 60 * 1000;
    case 'hours': return v * 60 * 60 * 1000;
    case 'days': return v * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// ============================================
// VERIFICATION PROCESSOR (resume interrupted jobs)
// ============================================

async function runVerificationWorker(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  // Find stuck verification jobs (running for over an hour without completion)
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: stuck, error } = await supabase
    .from('verification_jobs')
    .select('id')
    .eq('state', 'running')
    .lt('started_at', cutoff)
    .limit(BATCH_SIZE);

  if (error) return { reset: 0 };
  if (stuck?.length) {
    await supabase
      .from('verification_jobs')
      .update({ state: 'failed', last_error: 'Job timed out - restart verification' })
      .in('id', stuck.map((s: { id: string }) => s.id));
  }
  return { reset: stuck?.length ?? 0 };
}