'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle, Clock, AlertCircle, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
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

interface FollowUpRow {
  id: string;
  lead_id: string;
  scheduled_at: string;
  reminder_type: string;
  note?: string | null;
  done: boolean;
  completed_at?: string | null;
  notification_channels: string[];
  lead?: { id: string; buyer_name: string; company_name?: string | null; stage_id?: string | null; status: string };
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUpRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [done, setDone] = useState<string>('');
  const [upcoming, setUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: FollowUpRow[]; meta: { count: number } }>(
      `/api/follow-ups${getSearchParamString({ page, pageSize, q, done: done ? 'true' : done === 'false' ? 'false' : undefined, upcoming: upcoming ? 'true' : undefined })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load follow-ups'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, q, done, upcoming]);

  async function handleToggleDone(id: string, done: boolean) {
    try {
      await api(`/api/follow-ups/${id}`, { method: 'PATCH', body: { done } });
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, done, completed_at: done ? new Date().toISOString() : null } : f)));
      toast.success(done ? 'Follow-up marked done' : 'Follow-up reopened');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update follow-up');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this follow-up?')) return;
    setDeleting(id);
    try {
      await api(`/api/follow-ups/${id}`, { method: 'DELETE' });
      toast.success('Follow-up deleted');
      setItems((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete follow-up');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) return <Loading label="Loading follow-ups..." />;
  if (items.length === 0) return (
    <div className="space-y-6">
      <PageHeader title="Follow-ups" description="Track and manage scheduled follow-up activities">
        <Button asChild>
          <Link href="/leads/new"><Plus className="h-4 w-4" /> New Lead</Link>
        </Button>
      </PageHeader>
      <EmptyState icon={Clock} title="No follow-ups yet" description="Schedule follow-ups from lead details." action={<Button asChild><Link href="/leads/new"><Plus className="h-4 w-4" /> New Lead</Link></Button>} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-ups" description="Track and manage scheduled follow-up activities">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setUpcoming(!upcoming); setPage(1); setDone(''); }}>
            {upcoming ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {upcoming ? 'All' : 'Upcoming'}
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="md:max-w-xs"
            />
            <Select value={done} onValueChange={(v) => { setDone(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="md:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Pending</SelectItem>
                <SelectItem value="true">Done</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} follow-up{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((fu) => (
                <TableRow key={fu.id} className={fu.done ? 'bg-muted/30' : ''}>
                  <TableCell>
                    <Link href={`/leads/${fu.lead?.id}`} className="font-medium hover:underline">
                      {fu.lead?.buyer_name}
                    </Link>
                    {fu.lead?.company_name && <p className="text-xs text-muted-foreground">{fu.lead.company_name}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(fu.scheduled_at)}</TableCell>
                  <TableCell>
                    <span className="capitalize">{fu.reminder_type.replace('_', ' ')}</span>
                    {fu.notification_channels.length && (
                      <p className="text-xs text-muted-foreground">{fu.notification_channels.join(', ')}</p>
                    )}
                  </TableCell>
                  <TableCell>{fu.note ?? '—'}</TableCell>
                  <TableCell>
                    {fu.done ? (
                      <StatusBadge status="done" />
                    ) : new Date(fu.scheduled_at) < new Date() ? (
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
                          {!fu.done && (
                            <DropdownMenuItem onClick={() => handleToggleDone(fu.id, true)}>
                              <CheckCircle className="h-4 w-4" /> Mark Done
                            </DropdownMenuItem>
                          )}
                          {fu.done && (
                            <DropdownMenuItem onClick={() => handleToggleDone(fu.id, false)}>
                              <Clock className="h-4 w-4" /> Reopen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${fu.lead?.id}`}><Pencil className="h-4 w-4" /> View Lead</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive disabled={deleting === fu.id} onClick={() => handleDelete(fu.id)}>
                            <Trash2 className="h-4 w-4" /> {deleting === fu.id ? 'Deleting...' : 'Delete'}
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