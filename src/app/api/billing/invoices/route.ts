import { requireAuth, handleApiError, paginated } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { listSaasInvoices } from '@/lib/services/saas-billing';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const parsed = paginationSchema.parse(Object.fromEntries(url.searchParams));
    const status = url.searchParams.get('status') ?? undefined;

    const { items, count } = await listSaasInvoices(ctx.supabase, {
      organizationId: ctx.organizationId,
      page: parsed.page,
      pageSize: parsed.pageSize,
      status
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}
