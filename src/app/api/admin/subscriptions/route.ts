import { requireAdmin } from '@/lib/admin';
import { handleApiError, paginated } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { listSubscriptions } from '@/lib/services/saas-billing';

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin();
    const url = new URL(request.url);
    const parsed = paginationSchema.parse(Object.fromEntries(url.searchParams));
    const status = url.searchParams.get('status') ?? undefined;

    const { items, count } = await listSubscriptions(ctx.supabase, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      status
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}
