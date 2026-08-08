import { requireAuth, handleApiError, ok } from '@/lib/api';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data } = await ctx.supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('organization_id', ctx.organizationId)
      .order('updated_at', { ascending: false });
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return ok({ error: 'Missing id' }, { status: 400 });

    const { error } = await ctx.supabase
      .from('ai_conversations')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .eq('id', id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
