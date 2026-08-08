import { requireAuth, handleApiError, ok } from '@/lib/api';
import { categorySchema } from '@/lib/validations';
import { listCategories, createCategory } from '@/lib/services/products';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const categories = await listCategories(ctx.supabase, ctx.organizationId);
    return ok(categories);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = categorySchema.parse(body);
    const { data, error } = await createCategory(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
