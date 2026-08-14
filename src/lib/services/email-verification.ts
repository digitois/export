import type { SupabaseClient } from '@supabase/supabase-js';

export interface LocalVerifyResult {
  valid: boolean;
  reason?: 'invalid_syntax' | 'disposable_domain' | 'no_mx_record' | 'unknown';
}

export interface VerificationOutcome {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
  provider: 'local' | 'reoon' | 'neverbounce';
  cached: boolean;
}

export interface VerificationStats {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
}

export interface BulkVerifyJobStatus {
  jobId: string;
  state: string;
  progress: number;
  totalContacts: number;
  checked: number;
  valid: number;
  invalid: number;
  risky: number;
  rateLimited: number;
  lastError?: string;
}

// ============================================
// LOCAL VERIFICATION (Syntax + MX + Disposable)
// ============================================

const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'tempmail.com', 'throwaway.email', 'yopmail.com',
  'fakeinbox.com', 'trashmail.com', 'maildrop.cc',
  'getnada.com', 'temp-mail.org', 'mintemail.com'
];

export async function localCheckEmail(email: string): Promise<LocalVerifyResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'invalid_syntax' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: 'disposable_domain' };
  }

  return { valid: true };
}

// ============================================
// PROVIDER VERIFICATION (Reoon / NeverBounce)
// ============================================

async function reoonVerify(email: string): Promise<VerificationOutcome> {
  const apiKey = process.env.REOON_API_KEY;
  if (!apiKey) {
    return { status: 'unknown', isDeliverable: false, provider: 'reoon', cached: false };
  }

  try {
    const response = await fetch(`https://api.reoon.com/v1/verify?email=${encodeURIComponent(email)}&key=${apiKey}`);
    if (!response.ok) throw new Error('Reoon API error');

    const data = await response.json();
    let status: 'valid' | 'invalid' | 'risky' | 'unknown' = 'unknown';

    switch (data.status) {
      case 'safe': status = 'valid'; break;
      case 'invalid': status = 'invalid'; break;
      case 'risky': status = 'risky'; break;
      default: status = 'unknown';
    }

    return { status, isDeliverable: status === 'valid', provider: 'reoon', cached: false };
  } catch {
    return { status: 'unknown', isDeliverable: false, provider: 'reoon', cached: false };
  }
}

async function neverbounceVerify(email: string): Promise<VerificationOutcome> {
  const apiKey = process.env.NEVERBOUNCE_API_KEY;
  if (!apiKey) {
    return { status: 'unknown', isDeliverable: false, provider: 'neverbounce', cached: false };
  }

  try {
    const startResponse = await fetch('https://api.neverbounce.com/v4/jobs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey, input: email, input_location: 'supplied' })
    });

    const jobData = await startResponse.json();
    if (!jobData.success) throw new Error('NeverBounce job creation failed');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultResponse = await fetch(`https://api.neverbounce.com/v4/jobs/results?key=${apiKey}&job_id=${jobData.job_id}`);
    const resultData = await resultResponse.json();

    if (!resultData.success) throw new Error('NeverBounce results failed');

    const result = resultData.results?.[0];
    let status: 'valid' | 'invalid' | 'risky' | 'unknown' = 'unknown';

    switch (result?.result) {
      case 'valid': status = 'valid'; break;
      case 'invalid': status = 'invalid'; break;
      case 'catchall': status = 'risky'; break;
      case 'disposable': status = 'risky'; break;
      case 'unknown': status = 'unknown'; break;
    }

    return { status, isDeliverable: status === 'valid', provider: 'neverbounce', cached: false };
  } catch {
    return { status: 'unknown', isDeliverable: false, provider: 'neverbounce', cached: false };
  }
}

export async function verifyEmail(email: string, provider: 'reoon' | 'neverbounce' = 'reoon'): Promise<VerificationOutcome> {
  const local = await localCheckEmail(email);
  if (!local.valid) {
    return { status: 'invalid', isDeliverable: false, provider: 'local', cached: false };
  }

  if (provider === 'reoon') return reoonVerify(email);
  return neverbounceVerify(email);
}

// ============================================
// BULK VERIFICATION
// ============================================

export async function startBulkVerify(supabase: SupabaseClient, organizationId: string, userId: string, listId?: string, provider: 'local' | 'reoon' | 'neverbounce' = 'local') {
  let query = supabase
    .from('email_contacts')
    .select('id, email')
    .eq('organization_id', organizationId)
    .eq('unsubscribed', false);

  if (listId) query = query.eq('list_id', listId);

  const { data: contacts, error } = await query;
  if (error || !contacts?.length) {
    return { data: null, error: new Error('No contacts to verify') };
  }

  const { data: job, error: jobError } = await supabase
    .from('verification_jobs')
    .insert({
      organization_id: organizationId,
      list_id: listId ?? null,
      provider,
      state: 'pending',
      total_contacts: contacts.length,
      created_by: userId
    })
    .select()
    .single();

  if (jobError) return { data: null, error: new Error(jobError.message) };

  processBulkVerification(supabase, job.id, contacts.map(c => c.email), provider).catch(console.error);

  return { data: { jobId: job.id }, error: undefined };
}

async function processBulkVerification(supabase: SupabaseClient, jobId: string, emails: string[], provider: string) {
  await supabase
    .from('verification_jobs')
    .update({ state: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  let checked = 0;
  let valid = 0;
  let invalid = 0;
  let risky = 0;
  let rateLimited = 0;

  for (const email of emails) {
    try {
      let result: VerificationOutcome;
      if (provider === 'reoon') {
        result = await reoonVerify(email);
      } else if (provider === 'neverbounce') {
        result = await neverbounceVerify(email);
      } else {
        const local = await localCheckEmail(email);
        result = {
          status: local.valid ? 'valid' : 'invalid',
          isDeliverable: local.valid,
          provider: 'local',
          cached: false
        };
      }

      if (result.status === 'valid') valid++;
      else if (result.status === 'invalid') invalid++;
      else if (result.status === 'risky') risky++;

      await supabase
        .from('email_contacts')
        .update({
          verification_status: result.status,
          verification_provider: result.provider,
          verification_checked_at: new Date().toISOString(),
          verification_data: { ...result }
        })
        .eq('email', email);

    } catch (err) {
      console.error(`Verification failed for ${email}:`, err);
      rateLimited++;
    }

    checked++;

    if (checked % 10 === 0) {
      await supabase
        .from('verification_jobs')
        .update({
          progress: Math.round((checked / emails.length) * 100),
          checked_count: checked,
          valid_count: valid,
          invalid_count: invalid,
          risky_count: risky,
          rate_limited_count: rateLimited
        })
        .eq('id', jobId);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await supabase
    .from('verification_jobs')
    .update({
      state: 'completed',
      progress: 100,
      checked_count: checked,
      valid_count: valid,
      invalid_count: invalid,
      risky_count: risky,
      rate_limited_count: rateLimited,
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

export async function getBulkVerifyStatus(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from('verification_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getVerificationStats(supabase: SupabaseClient, organizationId: string): Promise<{ data: VerificationStats | null; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('verification_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return { data: { total: 0, valid: 0, invalid: 0, risky: 0, unknown: 0 }, error: undefined };
  }
  return { data, error: undefined };
}

export async function loadDisposableDomains(supabase: SupabaseClient) {
  const rows = DISPOSABLE_DOMAINS.map(domain => ({ domain, source: 'builtin' }));

  const { data, error } = await supabase
    .from('disposable_domains')
    .upsert(rows, { onConflict: 'domain' });

  return { data, error };
}

export async function getDisposableDomains(supabase: SupabaseClient): Promise<{ data: string[] | null; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('disposable_domains')
    .select('domain');

  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data ?? []).map((row: { domain: string }) => row.domain), error: undefined };
}