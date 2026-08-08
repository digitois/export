import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { blogPostSchema, paginationSchema } from '@/lib/validations';
import { listBlogPosts, createBlogPost } from '@/lib/services/blog';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listBlogPosts(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      status: params.status
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
    const parsed = blogPostSchema.parse(body);

    const { data, error } = await createBlogPost(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_blog_post',
      entityType: 'blog_post',
      entityId: data?.id,
      meta: { title: parsed.title },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
