import { requireAuth, handleApiError, ok } from '@/lib/api';
import { listUserOrganizations, getCurrentOrganization, switchUserOrganization } from '@/lib/services/organizations';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const { items, error } = await listUserOrganizations(ctx.supabase, ctx.userId);
    if (error) return ok({ error: error instanceof Error ? error.message : 'Failed to list organizations' }, { status: 400 });

    const { organizationId, error: currentError } = await getCurrentOrganization(ctx.supabase, ctx.userId);
    if (currentError) return ok({ error: currentError instanceof Error ? currentError.message : String(currentError) }, { status: 400 });

    return ok({ organizations: items, currentOrganizationId: organizationId });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) return ok({ error: 'organizationId is required' }, { status: 400 });

    const { data, error } = await switchUserOrganization(ctx.supabase, ctx.userId, organizationId);
    if (error) return ok({ error: error instanceof Error ? error.message : 'Failed to switch organization' }, { status: 400 });

    return ok({ organization: data });
  } catch (err) {
    return handleApiError(err);
  }
}