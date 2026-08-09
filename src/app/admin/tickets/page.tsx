'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  organizations?: { name?: string } | null;
}

export default function AdminTicketsPage() {
  const [items, setItems] = useState<TicketRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: TicketRow[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/tickets${getSearchParamString({ page, pageSize, status })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Review and respond to support tickets." />

      <div className="flex flex-col gap-3 lg:flex-row">
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="lg:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto self-center text-sm text-muted-foreground">{count} ticket{count !== 1 && 's'}</p>
      </div>

      {loading ? (
        <Loading label="Loading tickets..." />
      ) : items.length === 0 ? (
        <EmptyState title="No tickets found" description="Support tickets will appear here." icon={LifeBuoy} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-medium hover:underline">
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>{ticket.organizations?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.profiles?.full_name ?? ticket.profiles?.email ?? '-'}
                    </TableCell>
                    <TableCell><StatusBadge status={ticket.priority} /></TableCell>
                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(ticket.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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