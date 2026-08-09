import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { getAdminOverview } from '@/lib/services/admin';

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const overview = await getAdminOverview(ctx.supabase);
    return ok(overview);
  } catch (err) {
    return handleApiError(err);
  }
}