import { requireAuth, handleApiError, ok } from '@/lib/api';
import { followUpSchema } from '@/lib/validations';
import {
  getFollowUp,
  updateFollowUp,
  markFollowUpDone,
  deleteFollowUp
} from '@/lib/services/follow-ups';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getFollowUp(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Follow-up not found' }, { status: 404 });
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

    // Handle done toggle
    if (body.done !== undefined && Object.keys(body).length === 1) {
      const { data, error } = await markFollowUpDone(ctx.supabase, ctx.organizationId, id, body.done);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    const parsed = followUpSchema.parse(body);
    const { data, error } = await updateFollowUp(ctx.supabase, ctx.organizationId, id, parsed);
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
    const { error } = await deleteFollowUp(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}