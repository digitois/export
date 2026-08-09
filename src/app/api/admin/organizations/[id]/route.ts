import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { getOrganizationDetail, setOrganizationStatus } from '@/lib/services/admin';

const statusSchema = z.object({
  status: z.enum(['active', 'trial', 'suspended', 'cancelled'])
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;

    const org = await getOrganizationDetail(ctx.supabase, id);
    if (!org) return ok({ error: 'Organization not found' }, { status: 404 });
    return ok(org);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.parse(body);

    const { data, error } = await setOrganizationStatus(ctx.supabase, id, parsed.status);
    if (error) return ok({ error: error.message }, { status: 400 });
    if (!data) return ok({ error: 'Organization not found' }, { status: 404 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}