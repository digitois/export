import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';
import { listWorkflows, getWorkflowRuns } from '@/lib/services/workflows';
import { z } from 'zod';

const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.enum(['lead_created', 'lead_status_changed', 'inquiry_received']),
  templateId: z.string().uuid().nullable().optional(),
  listId: z.string().uuid().nullable().optional(),
  config: z.record(z.string()).default({}),
  isActive: z.boolean().default(true)
});

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflowId') ?? undefined;
    const includeRuns = url.searchParams.get('runs');
    const [workflows, runs] = await Promise.all([
      listWorkflows(ctx.supabase, ctx.organizationId),
      includeRuns ? getWorkflowRuns(ctx.supabase, ctx.organizationId, workflowId) : Promise.resolve([])
    ]);
    return ok({ workflows, runs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = workflowSchema.parse(body);

    const { data, error } = await ctx.supabase
      .from('email_workflows')
      .insert({
        organization_id: ctx.organizationId,
        name: parsed.name,
        trigger_type: parsed.triggerType,
        template_id: parsed.templateId ?? null,
        list_id: parsed.listId ?? null,
        config: parsed.config,
        is_active: parsed.isActive,
        created_by: ctx.userId
      })
      .select()
      .single();

    if (error) return apiError(error.message, 400);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return apiError('Missing id', 400);

    const { error } = await ctx.supabase
      .from('email_workflows')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .eq('id', id);
    if (error) return apiError(error.message, 400);
    return ok({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}