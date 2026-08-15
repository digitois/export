import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';
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

    const { data, error } = await createCampaign(ctx.supabase, ctx.organizationId, ctx.userId, {
      name: parsed.name,
      subject: parsed.subject,
      body: parsed.body,
      list_id: parsed.listId ?? null,
      template_id: parsed.templateId ?? null,
      variant_template_id: parsed.variantTemplateId ?? null,
      variant_split_percent: parsed.variantSplitPercent ?? 50
    });
    if (error) return apiError(error.message, 400);

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

    if (!id) return apiError('Missing id', 400);

    if (action === 'send') {
      const result = await sendCampaign(ctx.supabase, ctx.organizationId, id);
      if (result.error) return apiError(String(result.error), 400);
      return ok({ sent: result.sent });
    }

    if (action === 'schedule') {
      if (!scheduledAt) return apiError('scheduledAt required', 400);
      const { data, error } = await scheduleCampaign(ctx.supabase, ctx.organizationId, id, scheduledAt);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    return apiError('Unknown action', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
