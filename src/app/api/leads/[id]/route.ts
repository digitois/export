import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { leadSchema } from '@/lib/validations';
import { getLead, updateLead, deleteLead, updateLeadStatus, listLeadActivities, createLeadActivity } from '@/lib/services/leads';
import { logActivity } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const [lead, activities] = await Promise.all([
      getLead(ctx.supabase, ctx.organizationId, id),
      listLeadActivities(ctx.supabase, ctx.organizationId, id)
    ]);

    if (!lead.data) return ok({ error: 'Lead not found' }, { status: 404 });
    return ok({ ...lead.data, activities });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const prev = await getLead(ctx.supabase, ctx.organizationId, id);
    if (!prev.data) return ok({ error: 'Lead not found' }, { status: 404 });

    let data;
    if (body.status && Object.keys(body).length === 1) {
      const result = await updateLeadStatus(ctx.supabase, ctx.organizationId, id, body.status);
      data = result.data;
    } else {
      const parsed = leadSchema.partial().parse(body);
      const result = await updateLead(ctx.supabase, ctx.organizationId, id, parsed);
      data = result.data;
    }

    if (body.status && body.status !== prev.data.status) {
      await createLeadActivity(ctx.supabase, ctx.organizationId, ctx.userId, {
        leadId: id,
        type: 'status_change',
        description: `Status changed from ${prev.data.status} to ${body.status}`
      });
      await logActivity(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        type: 'status_changed',
        entityType: 'lead',
        entityId: id,
        description: `Lead ${prev.data.buyer_name}: ${prev.data.status} -> ${body.status}`
      });
    }

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_lead',
      entityType: 'lead',
      entityId: id,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteLead(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
