'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

interface Message {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

interface TicketDetail {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  organizations?: { name?: string } | null;
  support_messages?: Message[] | null;
}

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api<{ data: TicketDetail }>(`/api/admin/tickets/${id}`);
      setTicket(res.data);
      if (res.data?.status) setStatus(res.data.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    setSending(true);
    try {
      await api(`/api/admin/tickets/${id}`, { method: 'POST', body: { body: reply.trim() } });
      toast.success('Reply sent');
      setReply('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(next: string) {
    if (!id || next === status) return;
    setUpdatingStatus(true);
    try {
      await api(`/api/admin/tickets/${id}`, { method: 'PATCH', body: { status: next } });
      toast.success(`Status set to ${next}`);
      setStatus(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) return <Loading className="min-h-[60vh]" label="Loading ticket..." />;

  if (!ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description="The ticket may have been removed."
        action={<Button asChild><Link href="/admin/tickets"><ArrowLeft className="h-4 w-4" /> Back to tickets</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={ticket.subject} description={`${ticket.organizations?.name ?? '-'} · ${ticket.profiles?.full_name ?? ticket.profiles?.email ?? '-'}`}>
        <Button variant="outline" asChild>
          <Link href="/admin/tickets"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                <StatusBadge status={ticket.priority} />
                {ticket.category && <span className="text-sm text-muted-foreground">{ticket.category}</span>}
                <span className="ml-auto text-xs text-muted-foreground">Opened {formatDate(ticket.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(ticket.support_messages?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages yet. Reply below to start the conversation.
                </p>
              ) : (
                ticket.support_messages?.map((message) => (
                  <div key={message.id} className={`flex ${message.is_staff ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg border px-4 py-3 ${
                        message.is_staff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                        <span className="font-medium">
                          {message.is_staff ? 'Staff' : (message.profiles?.full_name ?? message.profiles?.email ?? 'User')}
                        </span>
                        <span>{formatDate(message.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={changeStatus}>
                  <SelectTrigger id="status" disabled={updatingStatus}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <form onSubmit={sendReply} className="space-y-2">
                <Label htmlFor="reply">Reply to customer</Label>
                <Textarea
                  id="reply"
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write your response..."
                  required
                />
                <Button type="submit" className="w-full" disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send reply
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}