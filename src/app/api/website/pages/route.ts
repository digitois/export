import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { z } from 'zod';
import { listWebsitePages, upsertWebsitePage, deleteWebsitePage } from '@/lib/services/website';

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  content: z.record(z.unknown()).optional(),
  blocks: z.array(z.record(z.unknown())).optional(),
  isHome: z.boolean().optional(),
  isPublished: z.boolean().optional()
});

export async function GET() {
  try {
    const ctx = await requireAuth();
    const pages = await listWebsitePages(ctx.supabase, ctx.organizationId);
    return ok(pages);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = pageSchema.parse(body);

    const content = parsed.blocks ? { blocks: parsed.blocks } : parsed.content;
    const { data, error } = await upsertWebsitePage(ctx.supabase, ctx.organizationId, {
      id: parsed.id,
      slug: parsed.slug,
      title: parsed.title,
      content,
      isHome: parsed.isHome,
      isPublished: parsed.isPublished
    });
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: parsed.id ? 'update_website_page' : 'create_website_page',
      entityType: 'website_page',
      entityId: data?.id,
      meta: { slug: parsed.slug, title: parsed.title },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAuth();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return ok({ error: 'Missing id' }, { status: 400 });
    const { error } = await deleteWebsitePage(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'delete_website_page',
      entityType: 'website_page',
      entityId: id,
      ip: getIp(request)
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
