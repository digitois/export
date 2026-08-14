import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Types for sender accounts (SES + Gmail OAuth)
export interface SenderAccount {
  id: string;
  organization_id: string;
  provider: 'ses' | 'gmail';
  email: string;
  display_name?: string | null;
  daily_send_limit: number;
  sent_today: number;
  last_sent_at?: string | null;
  is_active: boolean;
  is_verified: boolean;
  verification_token?: string | null;
  aws_region?: string | null;
  ses_configuration_set?: string | null;
  aws_access_key_id?: string | null; // encrypted
  aws_secret_access_key?: string | null; // encrypted
  gmail_refresh_token?: string | null; // encrypted
  gmail_access_token?: string | null; // encrypted
  gmail_token_expires_at?: string | null;
  bounce_rate: number;
  complaint_rate: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SenderAccountUsage {
  id: string;
  sender_account_id: string;
  date: string;
  sent_count: number;
  bounced_count: number;
  complained_count: number;
}

export interface CreateSESAccountInput {
  email: string;
  display_name?: string;
  daily_send_limit?: number;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  ses_configuration_set?: string;
}

export interface CreateGmailAccountInput {
  email: string;
  display_name?: string;
  daily_send_limit?: number;
  refresh_token: string;
  access_token?: string;
  token_expires_at?: string;
}

export interface UpdateSenderAccountInput {
  display_name?: string;
  daily_send_limit?: number;
  is_active?: boolean;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  ses_configuration_set?: string;
  gmail_refresh_token?: string;
}

// ============================================
// SENDER ACCOUNT CRUD
// ============================================

export async function listSenderAccounts(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function getSenderAccount(supabase: SupabaseClient, organizationId: string, accountId: string) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', accountId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function createSESAccount(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateSESAccountInput
) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .insert({
      organization_id: organizationId,
      provider: 'ses',
      email: input.email,
      display_name: input.display_name ?? null,
      daily_send_limit: input.daily_send_limit ?? 1000,
      aws_region: input.aws_region ?? 'us-east-1',
      aws_access_key_id: input.aws_access_key_id ?? null,
      aws_secret_access_key: input.aws_secret_access_key ?? null,
      ses_configuration_set: input.ses_configuration_set ?? null,
      created_by: userId,
      is_verified: false
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function createGmailAccount(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateGmailAccountInput
) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .insert({
      organization_id: organizationId,
      provider: 'gmail',
      email: input.email,
      display_name: input.display_name ?? null,
      daily_send_limit: input.daily_send_limit ?? 500,
      gmail_refresh_token: input.refresh_token,
      gmail_access_token: input.access_token ?? null,
      gmail_token_expires_at: input.token_expires_at ?? null,
      created_by: userId,
      is_verified: true // Gmail OAuth implies verification
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function updateSenderAccount(
  supabase: SupabaseClient,
  organizationId: string,
  accountId: string,
  input: UpdateSenderAccountInput
) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', accountId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function deleteSenderAccount(supabase: SupabaseClient, organizationId: string, accountId: string) {
  const { error } = await supabase
    .from('sender_accounts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', accountId);

  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function verifySenderAccount(supabase: SupabaseClient, organizationId: string, accountId: string) {
  const { data, error } = await supabase
    .from('sender_accounts')
    .update({ is_verified: true, verification_token: null })
    .eq('organization_id', organizationId)
    .eq('id', accountId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getGmailAuthUrl(supabase: SupabaseClient, organizationId: string): Promise<{ data: { authUrl: string } | null; error: Error | undefined }> {
  // In a real implementation, this would generate a Google OAuth URL
  // For now, return a placeholder
  const clientId = process.env.GMAIL_CLIENT_ID;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
  
  if (!clientId || !redirectUri) {
    return { data: null, error: new Error('Gmail OAuth not configured') };
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(organizationId)}`;

  return { data: { authUrl }, error: undefined };
}

export async function handleGmailCallback(supabase: SupabaseClient, organizationId: string, code: string) {
  // Exchange code for tokens
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return { data: null, error: new Error('Gmail OAuth not configured') };
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    return { data: null, error: new Error(`Token exchange failed: ${error}`) };
  }

  const tokens = await response.json();
  
  // Get user email from Gmail API
  const userInfo = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  }).then(r => r.json());

  const email = userInfo.emailAddress;
  
  // Create or update sender account
  const { data, error } = await supabase
    .from('sender_accounts')
    .upsert({
      organization_id: organizationId,
      provider: 'gmail',
      email,
      gmail_refresh_token: tokens.refresh_token,
      gmail_access_token: tokens.access_token,
      gmail_token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      is_verified: true,
      is_active: true
    }, { onConflict: 'organization_id,email' })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getNextSenderAccount(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase.rpc('get_next_sender_account', { p_organization_id: organizationId });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function recordSenderAccountUsage(supabase: SupabaseClient, senderAccountId: string, event: 'sent' | 'bounced' | 'complained') {
  const { error } = await supabase.rpc('record_sender_account_usage', { 
    p_sender_account_id: senderAccountId, 
    p_event: event 
  });
  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function testSenderAccount(supabase: SupabaseClient, organizationId: string, accountId: string) {
  const { data: account } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', accountId)
    .single();

  if (!account) return { data: null, error: new Error('Account not found') };

  // Send test email
  try {
    await sendEmail({
      to: account.email,
      subject: 'Export OS - Sender Account Test',
      html: `<p>This is a test email from your sender account <strong>${account.email}</strong>.</p>`
    });
    return { data: { message: 'Test email sent' }, error: undefined };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to send test email') };
  }
}