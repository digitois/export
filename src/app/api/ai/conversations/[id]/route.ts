import { requireAuth, handleApiError, ok } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { data: conversation } = await ctx.supabase
      .from('ai_conversations')
      .select('id, title')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (!conversation) return ok({ error: 'Conversation not found' }, { status: 404 });

    const { data: messages } = await ctx.supabase
      .from('ai_messages')
      .select('id, role, content, provider, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    return ok({ conversation, messages: messages ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}
