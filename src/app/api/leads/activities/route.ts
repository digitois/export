import { requireAuth, handleApiError, ok } from '@/lib/api';
import { leadActivitySchema } from '@/lib/validations';
import { createLeadActivity } from '@/lib/services/leads';

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = leadActivitySchema.parse(body);

    const { data, error } = await createLeadActivity(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
