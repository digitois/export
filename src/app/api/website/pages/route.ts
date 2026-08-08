import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';
import { listWebsitePages, upsertWebsitePage, deleteWebsitePage } from '@/lib/services/website';

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  content: z.record(z.unknown()).optional(),
  isHome: z.boolean().optional()
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
    const { data, error } = await upsertWebsitePage(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
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
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
