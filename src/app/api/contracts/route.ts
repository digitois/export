import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { contractSchema, paginationSchema } from '@/lib/validations';
import { listContracts, createContract } from '@/lib/services/contracts';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listContracts(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      leadId: params.leadId,
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
    const parsed = contractSchema.parse(body);

    const { data, error } = await createContract(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_contract',
      entityType: 'contract',
      entityId: data?.id,
      meta: { leadId: parsed.leadId, status: parsed.status },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}