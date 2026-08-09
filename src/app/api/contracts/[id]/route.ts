import { requireAuth, handleApiError, ok } from '@/lib/api';
import { contractSchema } from '@/lib/validations';
import {
  getContract,
  updateContract,
  signContract,
  deleteContract
} from '@/lib/services/contracts';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getContract(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Contract not found' }, { status: 404 });
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

    // Handle sign action
    if (body.sign === true && Object.keys(body).length === 1) {
      const { data, error } = await signContract(ctx.supabase, ctx.organizationId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    const parsed = contractSchema.parse(body);
    const { data, error } = await updateContract(ctx.supabase, ctx.organizationId, id, parsed);
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
    const { error } = await deleteContract(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}