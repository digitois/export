import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { websiteSettingsSchema } from '@/lib/validations';
import { getWebsiteSettings, upsertWebsiteSettings, setWebsitePublished } from '@/lib/services/website';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data, error } = await getWebsiteSettings(ctx.supabase, ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = websiteSettingsSchema.parse(body);

    const { data, error } = await upsertWebsiteSettings(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_website_settings',
      entityType: 'website_settings',
      entityId: ctx.organizationId,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const isPublished = Boolean(body.isPublished);

    const { data, error } = await setWebsitePublished(ctx.supabase, ctx.organizationId, isPublished);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: isPublished ? 'publish_website' : 'unpublish_website',
      entityType: 'website_settings',
      entityId: ctx.organizationId,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
