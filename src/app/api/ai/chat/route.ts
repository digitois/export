import { requireAuth, handleApiError, ok } from '@/lib/api';
import { aiChatSchema } from '@/lib/validations';
import { completeChat } from '@/lib/ai';
import type { SupabaseClient } from '@supabase/supabase-js';

async function recordUsage(
  supabase: SupabaseClient,
  organizationId: string,
  provider: string,
  tokensIn: number,
  tokensOut: number
) {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('month', month)
    .eq('provider', provider)
    .maybeSingle();

  if (data) {
    await supabase
      .from('ai_usage')
      .update({
        tokens_in: (data.tokens_in ?? 0) + tokensIn,
        tokens_out: (data.tokens_out ?? 0) + tokensOut,
        requests: (data.requests ?? 0) + 1
      })
      .eq('id', data.id);
  } else {
    await supabase.from('ai_usage').insert({
      organization_id: organizationId,
      month,
      provider,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      requests: 1
    });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = aiChatSchema.parse(body);

    let conversationId = parsed.conversationId;

    if (conversationId) {
      const { data: exists } = await ctx.supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle();
      if (!exists) conversationId = null;
    }

    if (!conversationId) {
      const { data: conversation } = await ctx.supabase
        .from('ai_conversations')
        .insert({
          organization_id: ctx.organizationId,
          user_id: ctx.userId,
          title: parsed.message.slice(0, 60)
        })
        .select()
        .single();
      conversationId = conversation?.id ?? null;
    }

    if (!conversationId) {
      return ok({ error: 'Could not create conversation' }, { status: 500 });
    }

    // Fetch recent history for context
    const { data: history } = await ctx.supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const historyMessages = (history ?? []).map((m) => ({
      role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'user') as 'user' | 'assistant',
      content: m.content
    }));

    const capability = parsed.capability ?? null;
    const capabilityContext = capability
      ? `[Task type: ${capability}. Tailor your response for this export task.]`
      : '';

    await ctx.supabase.from('ai_messages').insert({
      organization_id: ctx.organizationId,
      conversation_id: conversationId,
      role: 'user',
      content: parsed.message
    });

    const completion = await completeChat([
      ...historyMessages.slice(-12),
      { role: 'user', content: capabilityContext ? `${capabilityContext}\n${parsed.message}` : parsed.message }
    ]);

    await ctx.supabase.from('ai_messages').insert({
      organization_id: ctx.organizationId,
      conversation_id: conversationId,
      role: 'assistant',
      content: completion.content,
      tokens_in: completion.tokensIn,
      tokens_out: completion.tokensOut,
      provider: completion.provider
    });

    await ctx.supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    await recordUsage(ctx.supabase, ctx.organizationId, completion.provider, completion.tokensIn, completion.tokensOut);

    return ok({ conversationId, content: completion.content, provider: completion.provider });
  } catch (err) {
    return handleApiError(err);
  }
}
