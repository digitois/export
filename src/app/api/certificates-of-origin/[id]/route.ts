import { requireAuth, handleApiError, ok } from '@/lib/api';
import { certificateOfOriginSchema } from '@/lib/validations';
import {
  getCertificateOfOrigin,
  updateCertificateOfOrigin,
  deleteCertificateOfOrigin
} from '@/lib/services/certificates';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getCertificateOfOrigin(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Certificate not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = certificateOfOriginSchema.parse(body);
    const { data, error } = await updateCertificateOfOrigin(ctx.supabase, ctx.organizationId, id, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteCertificateOfOrigin(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
