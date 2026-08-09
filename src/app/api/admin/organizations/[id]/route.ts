import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { getOrganizationDetail, setOrganizationStatus, updateOrganizationWhiteLabel } from '@/lib/services/admin';

const statusSchema = z.object({
  status: z.enum(['active', 'trial', 'suspended', 'cancelled'])
});

const whiteLabelSchema = z.object({
  whiteLabelEnabled: z.boolean().optional(),
  whiteLabelAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color').nullable().optional(),
  whiteLabelLogoUrl: z.string().url().nullable().optional(),
  whiteLabelFaviconUrl: z.string().url().nullable().optional(),
  customDomain: z.string().nullable().optional(),
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

    // Handle white-label updates
    if (Object.keys(body).some((k) => k.startsWith('whiteLabel') || k === 'customDomain')) {
      const parsed = whiteLabelSchema.parse(body);
      const { data, error } = await updateOrganizationWhiteLabel(ctx.supabase, id, parsed);
      if (error) return ok({ error: error.message }, { status: 400 });
      if (!data) return ok({ error: 'Organization not found' }, { status: 404 });
      return ok(data);
    }

    // Handle status updates
    const parsed = statusSchema.parse(body);

    const { data, error } = await setOrganizationStatus(ctx.supabase, id, parsed.status);
    if (error) return ok({ error: error.message }, { status: 400 });
    if (!data) return ok({ error: 'Organization not found' }, { status: 404 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}