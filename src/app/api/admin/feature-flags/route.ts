import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { featureFlagSchema } from '@/lib/validations';
import { listFeatureFlags, upsertFeatureFlag } from '@/lib/services/admin';

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const data = await listFeatureFlags(ctx.supabase);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json();
    const parsed = featureFlagSchema.parse(body);

    const { data, error } = await upsertFeatureFlag(ctx.supabase, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}