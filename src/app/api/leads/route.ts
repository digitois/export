import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { leadSchema, paginationSchema } from '@/lib/validations';
import { listLeads, createLead } from '@/lib/services/leads';
import { runWorkflows } from '@/lib/services/workflows';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listLeads(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      status: params.status,
      priority: params.priority,
      source: params.source,
      assignedTo: params.assignedTo
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = leadSchema.parse(body);

    const { data, error } = await createLead(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_lead',
      entityType: 'lead',
      entityId: data?.id,
      meta: { buyerName: parsed.buyerName },
      ip: getIp(request)
    });

    // Trigger email automations (lead_created workflows)
    await runWorkflows(ctx.supabase, {
      trigger: 'lead_created',
      organizationId: ctx.organizationId,
      lead: {
        id: data?.id ?? '',
        email: parsed.email ?? null,
        name: parsed.buyerName,
        company: parsed.companyName ?? null,
        country: parsed.country ?? null,
        status: parsed.status
      }
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
