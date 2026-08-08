import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { slugify } from '@/lib/utils';

export async function createOrganization(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; slug?: string }
) {
  const baseSlug = slugify(input.slug ?? input.name);
  let slug = baseSlug;

  const { data: existing } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    slug = `${baseSlug}-${randomBytes(2).toString('hex')}`;
  }

  const subdomain = slug;

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name: input.name, slug, website_subdomain: subdomain, status: 'trial' })
    .select()
    .single();

  if (error || !org) return { data: null, error };

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
    status: 'active'
  });

  if (memberError) return { data: null, error: memberError };

  return { data: org, error: null };
}

export async function inviteMember(
  supabase: SupabaseClient,
  organizationId: string,
  invitedBy: string,
  input: { email: string; role: string }
) {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const { data, error } = await supabase.from('invitations').insert({
    organization_id: organizationId,
    email: input.email.toLowerCase(),
    role: input.role,
    token,
    invited_by: invitedBy,
    status: 'pending',
    expires_at: expiresAt
  }).select().single();

  return { data, error, token };
}

export async function listTeamMembers(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('organization_members')
    .select('id, role, title, status, created_at, profiles(id, full_name, email, avatar_url)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { id: string; full_name: string; email: string; avatar_url: string | null } | null;
    return {
      id: row.id,
      role: row.role,
      title: row.title,
      status: row.status,
      user_id: profile?.id ?? null,
      full_name: profile?.full_name ?? 'Invited user',
      email: profile?.email ?? 'pending',
      avatar_url: profile?.avatar_url ?? null
    };
  });
}

export async function listInvitations(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function updateMemberRole(supabase: SupabaseClient, organizationId: string, memberId: string, role: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('id', memberId)
    .select()
    .single();
  return { data, error };
}

export async function removeMember(supabase: SupabaseClient, organizationId: string, memberId: string) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', memberId);
  return { error };
}

export async function revokeInvitation(supabase: SupabaseClient, organizationId: string, invitationId: string) {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('organization_id', organizationId)
    .eq('id', invitationId);
  return { error };
}

export async function acceptInvitation(supabase: SupabaseClient, token: string, userId: string) {
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (!invitation) return { error: 'Invalid invitation link.' };
  if (invitation.status !== 'pending') return { error: 'This invitation is no longer valid.' };
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation has expired.' };

  const { error } = await supabase.from('organization_members').upsert(
    {
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      status: 'active'
    },
    { onConflict: 'organization_id,user_id' }
  );

  if (error) return { error: 'Failed to join organization.' };

  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return { organizationId: invitation.organization_id, error: null };
}

const COMPANY_PROFILE_COLUMN_MAP: Record<string, string> = {
  companyName: 'company_name',
  logoUrl: 'logo_url',
  gstNumber: 'gst_number',
  iecNumber: 'iec_number',
  panNumber: 'pan_number',
  addressLine1: 'address_line1',
  addressLine2: 'address_line2',
  contactPerson: 'contact_person',
  yearEstablished: 'year_established',
  businessType: 'business_type',
  employeeCount: 'employee_count',
  factoryAddress: 'factory_address',
  exportMarkets: 'export_markets',
  productCategories: 'product_categories',
  socialLinks: 'social_links',
  brochureUrl: 'brochure_url'
};

export async function getCompanyProfile(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data;
}

export async function upsertCompanyProfile(supabase: SupabaseClient, organizationId: string, payload: Record<string, unknown>) {
  const record: Record<string, unknown> = { organization_id: organizationId };
  for (const [key, value] of Object.entries(payload)) {
    record[COMPANY_PROFILE_COLUMN_MAP[key] ?? key] = value === undefined ? null : value;
  }
  const { data, error } = await supabase
    .from('company_profiles')
    .upsert(record, { onConflict: 'organization_id' })
    .select()
    .single();
  return { data, error };
}

export const COMPANY_PROFILE_FIELDS = Object.keys(COMPANY_PROFILE_COLUMN_MAP);
