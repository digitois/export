import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getOrganization, updateOrganizationWhiteLabel } from '@/lib/services/organizations';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    // Get the organization the user is currently in
    const { data: membership } = await ctx.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!membership) return ok({ error: 'No organization found' }, { status: 404 });

    const { data, error } = await getOrganization(ctx.supabase, membership.organization_id);
    if (error || !data) return ok({ error: 'Organization not found' }, { status: 404 });

    return ok({
      whiteLabelEnabled: data.white_label_enabled,
      whiteLabelAccent: data.white_label_accent,
      whiteLabelLogoUrl: data.white_label_logo_url,
      whiteLabelFaviconUrl: data.white_label_favicon_url,
      customDomain: data.custom_domain,
      customDomainVerified: data.custom_domain_verified
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAuth();

    // Check if user is owner/admin/manager
    const { data: membership } = await ctx.supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
      return ok({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { data, error } = await updateOrganizationWhiteLabel(ctx.supabase, membership.organization_id, body);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}