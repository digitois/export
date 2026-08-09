import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject } from '@/lib/utils';

export interface OrgWhiteLabelInput {
  whiteLabelEnabled?: boolean;
  whiteLabelAccent?: string | null;
  whiteLabelLogoUrl?: string | null;
  whiteLabelFaviconUrl?: string | null;
  customDomain?: string | null;
}

export interface CompanyProfileInput {
  companyName: string;
  logoUrl?: string | null;
  gstNumber?: string | null;
  iecNumber?: string | null;
  panNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  yearEstablished?: number | null;
  businessType?: string | null;
  employeeCount?: string | null;
  factoryAddress?: string | null;
  certifications?: string[];
  exportMarkets?: string[];
  productCategories?: string[];
  socialLinks?: Record<string, string>;
  brochureUrl?: string | null;
  tagline?: string | null;
  about?: string | null;
}

export interface TeamMemberInviteInput {
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'employee';
}

export interface UpdateMemberRoleInput {
  role: 'admin' | 'manager' | 'employee';
}

const ORG_SELECT = '*, plan:plans(code, name)';

export async function getOrganization(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select(ORG_SELECT)
    .eq('id', organizationId)
    .single();
  return { data, error };
}

export async function getCompanyProfile(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertCompanyProfile(
  supabase: SupabaseClient,
  organizationId: string,
  input: CompanyProfileInput
) {
  const { data, error } = await supabase
    .from('organizations')
    .upsert({
      id: organizationId,
      ...camelToSnakeObject(input as unknown as Record<string, unknown>),
    }, { onConflict: 'id' })
    .select()
    .single();
  return { data, error };
}

export async function updateOrganizationWhiteLabel(
  supabase: SupabaseClient,
  organizationId: string,
  input: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('organizations')
    .update(input)
    .eq('id', organizationId)
    .select()
    .single();
  return { data, error };
}

export async function listUserOrganizations(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      organizations!inner (
        id,
        name,
        slug,
        white_label_enabled,
        white_label_accent,
        white_label_logo_url,
        white_label_favicon_url,
        custom_domain,
        custom_domain_verified,
        plan:plans(code, name)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
  return { items: data ?? [], error };
}

export async function switchUserOrganization(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
) {
  // Verify user is a member of this org
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    return { data: null, error: new Error('Not a member of this organization') };
  }

  // Update user's current organization
  const { data, error } = await supabase
    .from('profiles')
    .update({ current_organization_id: organizationId })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

export async function getCurrentOrganization(supabase: SupabaseClient, userId: string): Promise<{ organizationId: string | null; error: Error | null }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', userId)
    .single();

  if (!profile?.current_organization_id) {
    // Fallback to first active membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return { organizationId: membership?.organization_id ?? null, error: null };
  }

  return { organizationId: profile.current_organization_id, error: null };
}

// Team members
export async function listTeamMembers(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profiles(id, full_name, email, avatar_url)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  return { items: data ?? [], error };
}

export async function inviteMember(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: { email: string; role: string }
) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Store invitation
  const { error: invError } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email: input.email,
      role: input.role,
      token,
      invited_by: userId,
      status: 'pending',
      expires_at: expiresAt
    });

  if (invError) return { data: null, error: invError, token: null };

  // Also create a pending membership record
  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      email: input.email,
      role: input.role,
      invited_by: userId,
      status: 'pending'
    })
    .select()
    .single();

  return { data, error, token };
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  token: string,
  userId: string
) {
  // First, find the invitation by token
  const { data: invitation, error: invError } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (invError || !invitation) {
    return { data: null, error: new Error('Invalid or expired invitation token') };
  }

  // Check if user email matches invitation email
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (user.user?.email !== invitation.email) {
    return { data: null, error: new Error('Invitation email does not match your account') };
  }

  // Update the invitation status
  await supabase
    .from('organization_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  // Add user as member
  const { data, error } = await supabase
    .from('organization_members')
    .upsert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: 'employee',
      status: 'active'
    }, { onConflict: 'organization_id,user_id' })
    .select()
    .single();

  return { data: { organizationId: invitation.organization_id }, error };
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string,
  role: string
) {
  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('id', memberId)
    .select()
    .single();
  return { data, error };
}

export async function removeMember(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string
) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', memberId);
  return { error };
}

export async function revokeInvitation(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string
) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', memberId)
    .eq('status', 'pending');
  return { error };
}