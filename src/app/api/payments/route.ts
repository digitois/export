import { requireAuth, handleApiError, ok } from '@/lib/api';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data } = await ctx.supabase
      .from('payments')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })
      .limit(50);
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}
