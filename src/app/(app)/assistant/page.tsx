'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MessageSquare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string | null;
  created_at?: string;
}

interface ChatResponse {
  conversationId: string;
  content: string;
  provider: string;
}

const SUGGESTIONS = [
  'Draft an export sales email',
  'Write product description for turmeric',
  'Draft HSN compliance note',
  'Translate to Spanish'
];

let localSeq = 0;
function localId() {
  localSeq += 1;
  return `local-${Date.now()}-${localSeq}`;
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function loadConversations() {
    const res = await api<{ data: Conversation[] }>('/api/ai/conversations');
    setConversations(res.data);
  }

  async function selectConversation(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    setError(null);
    try {
      const res = await api<{ data: { conversation: { id: string; title: string }; messages: ChatMessage[] } }>(
        `/api/ai/conversations/${id}`
      );
      setMessages(res.data.messages);
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setInput('');
  }

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { id: localId(), role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await api<{ data: ChatResponse }>('/api/ai/chat', {
        method: 'POST',
        body: { message, conversationId: activeId, capability: undefined }
      });
      setActiveId(res.data.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: localId(), role: 'assistant', content: res.data.content, provider: res.data.provider }
      ]);
      loadConversations().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a reply');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api(`/api/ai/conversations?id=${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) newChat();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const activeConversation = conversations.find((c) => c.id === activeId);
  const showHero = !activeId && messages.length === 0 && !sending;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" description="Your export co-pilot for emails, product pages and compliance." />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex h-[calc(100vh-13rem)] max-h-[640px] min-h-[480px] flex-col">
          <div className="flex items-center justify-between gap-2 border-b p-4">
            <p className="text-sm font-semibold">Conversations</p>
            <Button size="sm" variant="outline" onClick={newChat}>
              <Plus className="h-3.5 w-3.5" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') selectConversation(c.id);
                    }}
                    className={cn(
                      'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                      c.id === activeId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex h-[calc(100vh-13rem)] max-h-[640px] min-h-[480px] flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">
              {activeConversation?.title ?? (messages.length ? 'New chat' : 'Welcome')}
            </p>
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {showHero ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-semibold">How can I help your export business?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Draft emails, product copy, compliance notes or translations.
                  </p>
                </div>
                <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="rounded-lg border bg-background px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground'
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                    {m.role === 'assistant' && m.provider && (
                      <p className="mt-1 text-xs opacity-60">via {m.provider}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <p className="mx-auto max-w-md text-center text-sm text-destructive">{error}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the co-pilot anything... (Enter to send, Shift+Enter for newline)"
                rows={2}
                disabled={sending}
                className="min-h-[40px] flex-1 resize-none"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()} className="mb-0.5">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}