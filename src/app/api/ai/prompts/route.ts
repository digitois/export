import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';

const promptSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  category: z.string().default('general'),
  isFavorite: z.boolean().default(false)
});

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data } = await ctx.supabase
      .from('ai_prompts')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false });
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = promptSchema.parse(body);

    const { data, error } = await ctx.supabase
      .from('ai_prompts')
      .insert({ ...parsed, organization_id: ctx.organizationId, created_by: ctx.userId })
      .select()
      .single();

    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
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
    const { error } = await ctx.supabase.from('ai_prompts').delete().eq('id', id).eq('organization_id', ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
