import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { expenseSchema, paginationSchema } from '@/lib/validations';
import { listExpenses, createExpense } from '@/lib/services/expenses';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listExpenses(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      category: params.category
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
    const parsed = expenseSchema.parse(body);

    const { data, error } = await createExpense(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_expense',
      entityType: 'expense',
      entityId: data?.id,
      meta: { category: parsed.category, amount: parsed.amount },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
