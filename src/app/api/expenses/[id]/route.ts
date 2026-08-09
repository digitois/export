import { requireAuth, handleApiError, ok } from '@/lib/api';
import { expenseSchema } from '@/lib/validations';
import { getExpense, updateExpense, deleteExpense } from '@/lib/services/expenses';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getExpense(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Expense not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = expenseSchema.parse(body);
    const { data, error } = await updateExpense(ctx.supabase, ctx.organizationId, id, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteExpense(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
