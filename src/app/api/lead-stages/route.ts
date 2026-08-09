import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { leadStageSchema } from '@/lib/validations';
import { listLeadStages, createLeadStage } from '@/lib/services/lead-stages';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const { items, error } = await listLeadStages(ctx.supabase, ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = leadStageSchema.parse(body);

    const { data, error } = await createLeadStage(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_lead_stage',
      entityType: 'lead_stage',
      entityId: data?.id,
      meta: { name: parsed.name },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}