import { requireAuth, handleApiError, ok } from '@/lib/api';
import { emailCampaignSchema } from '@/lib/validations';
import { listCampaigns, createCampaign, scheduleCampaign, sendCampaign } from '@/lib/services/email';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const campaigns = await listCampaigns(ctx.supabase, ctx.organizationId);
    return ok(campaigns);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = emailCampaignSchema.parse(body);

    if (parsed.templateId) {
      const { data: template } = await ctx.supabase
        .from('email_templates')
        .select('subject, body')
        .eq('id', parsed.templateId)
        .eq('organization_id', ctx.organizationId)
        .single();
      if (template) {
        parsed.subject = template.subject;
        parsed.body = template.body;
      }
    }

    const { data, error } = await createCampaign(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    if (parsed.scheduledAt) {
      await scheduleCampaign(ctx.supabase, ctx.organizationId, data!.id, parsed.scheduledAt);
    }

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const { id, action, scheduledAt } = body as { id: string; action: 'send' | 'schedule'; scheduledAt?: string };

    if (!id) return ok({ error: 'Missing id' }, { status: 400 });

    if (action === 'send') {
      const result = await sendCampaign(ctx.supabase, ctx.organizationId, id);
      if (result.error) return ok({ error: result.error }, { status: 400 });
      return ok({ sent: result.sent });
    }

    if (action === 'schedule') {
      if (!scheduledAt) return ok({ error: 'scheduledAt required' }, { status: 400 });
      const { data, error } = await scheduleCampaign(ctx.supabase, ctx.organizationId, id, scheduledAt);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
