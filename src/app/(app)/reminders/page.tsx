'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle, Clock, AlertCircle, Bell, MoreHorizontal, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';

interface ReminderRow {
  id: string;
  follow_up_id?: string | null;
  lead_id?: string | null;
  title: string;
  description?: string | null;
  remind_at: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  lead?: { id: string; buyer_name: string; company_name?: string | null; stage_id?: string | null; status: string };
  follow_up?: { id: string; scheduled_at: string; note?: string | null };
}

export default function RemindersPage() {
  const [items, setItems] = useState<ReminderRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('unread');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: ReminderRow[]; meta: { count: number } }>(
      `/api/reminders${getSearchParamString({ page, pageSize, q, unreadOnly: filter === 'unread' ? 'true' : undefined, upcomingOnly: filter === 'upcoming' ? 'true' : undefined })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load reminders'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, q, filter]);

  async function handleMarkRead(id: string) {
    try {
      await api(`/api/reminders/${id}`, { method: 'PATCH', body: { read: true } });
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
      toast.success('Marked as read');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark read');
    }
  }

  async function handleDismiss(id: string) {
    try {
      await api(`/api/reminders/${id}`, { method: 'PATCH', body: { dismiss: true } });
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, is_dismissed: true } : r)));
      toast.success('Dismissed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dismiss');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this reminder?')) return;
    setDeleting(id);
    try {
      await api(`/api/reminders/${id}`, { method: 'DELETE' });
      toast.success('Reminder deleted');
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete reminder');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) return <Loading label="Loading reminders..." />;
  if (items.length === 0) return (
    <div className="space-y-6">
      <PageHeader title="Reminders" description="Upcoming and overdue reminders">
        <Button variant="outline"><Bell className="h-4 w-4" /></Button>
      </PageHeader>
      <EmptyState icon={Bell} title="No reminders" description="Reminders appear when follow-ups are due." />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reminders" description="Your upcoming and overdue reminders">
        <div className="flex gap-2">
          <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => { setFilter('unread'); setPage(1); }}>
            <Mail className="h-4 w-4" /> Unread
          </Button>
          <Button variant={filter === 'upcoming' ? 'default' : 'outline'} onClick={() => { setFilter('upcoming'); setPage(1); }}>
            <Clock className="h-4 w-4" /> Upcoming
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => { setFilter('all'); setPage(1); }}>
            <Mail className="h-4 w-4" /> All
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search reminders..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="md:max-w-xs"
            />
            <div className="ml-auto text-sm text-muted-foreground">{count} reminder{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Related</TableHead>
                <TableHead>Remind At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((rem) => (
                <TableRow key={rem.id} className={rem.is_dismissed ? 'bg-muted/30' : rem.is_read ? '' : 'bg-primary/5'}>
                  <TableCell>
                    <p className="font-medium">{rem.title}</p>
                    {rem.description && <p className="text-xs text-muted-foreground">{rem.description}</p>}
                  </TableCell>
                  <TableCell>
                    {rem.lead ? (
                      <Link href={`/leads/${rem.lead.id}`} className="font-medium hover:underline">
                        {rem.lead.buyer_name}
                      </Link>
                    ) : rem.follow_up ? (
                      <span className="text-sm text-muted-foreground">Follow-up</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(rem.remind_at)}</TableCell>
                  <TableCell>
                    {rem.is_dismissed ? (
                      <StatusBadge status="cancelled" />
                    ) : rem.is_read ? (
                      <StatusBadge status="cleared" />
                    ) : new Date(rem.remind_at) < new Date() ? (
                      <StatusBadge status="overdue" />
                    ) : (
                      <StatusBadge status="pending" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!rem.is_read && (
                            <DropdownMenuItem onClick={() => handleMarkRead(rem.id)}>
                              <CheckCircle className="h-4 w-4" /> Mark Read
                            </DropdownMenuItem>
                          )}
                          {!rem.is_dismissed && (
                            <DropdownMenuItem onClick={() => handleDismiss(rem.id)}>
                              <AlertCircle className="h-4 w-4" /> Dismiss
                            </DropdownMenuItem>
                          )}
                          {rem.lead && (
                            <DropdownMenuItem asChild>
                              <Link href={`/leads/${rem.lead.id}`}><Mail className="h-4 w-4" /> View Lead</Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive disabled={deleting === rem.id} onClick={() => handleDelete(rem.id)}>
                            <Trash2 className="h-4 w-4" /> {deleting === rem.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}