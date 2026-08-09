import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { platformPlanSchema } from '@/lib/validations';
import { listPlans, createPlan, planPayloadToSnake } from '@/lib/services/admin';

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const data = await listPlans(ctx.supabase);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json();
    const parsed = platformPlanSchema.parse(body);
    const payload = planPayloadToSnake(parsed);

    const { data, error } = await createPlan(ctx.supabase, payload);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}