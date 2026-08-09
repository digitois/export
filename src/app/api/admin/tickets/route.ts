import { requireAdmin } from '@/lib/admin';
import { handleApiError, paginated } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { listSupportTickets } from '@/lib/services/admin';

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listSupportTickets(ctx.supabase, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      status: params.status || undefined
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}