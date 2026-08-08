'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, MoreHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LEAD_SOURCES, LEAD_PRIORITIES, LEAD_STATUSES } from '@/lib/constants';

interface LeadRow {
  id: string;
  company_name?: string | null;
  buyer_name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  product_interested?: string | null;
  lead_value?: number | null;
  currency: string;
  source: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to?: { full_name?: string; email?: string } | null;
}

export default function LeadsIndexPage() {
  const [items, setItems] = useState<LeadRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: LeadRow[]; meta: { count: number; totalPages: number } }>(
      `/api/leads${getSearchParamString({ page, pageSize, q, status, priority, source })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load leads'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, status, priority, source]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api(`/api/leads/${id}`, { method: 'DELETE' });
      toast.success('Lead deleted');
      setItems((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Track and manage buyer inquiries">
        <Button asChild>
          <Link href="/leads/new">
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              placeholder="Search by buyer, company or email..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="lg:max-w-sm"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="lg:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="status-all">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="lg:w-40"><SelectValue placeholder="All priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-all">All priorities</SelectItem>
                {LEAD_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
              <SelectTrigger className="lg:w-44"><SelectValue placeholder="All sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="source-all">All sources</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="ml-auto self-center text-sm text-muted-foreground">{count} lead{count !== 1 && 's'}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading leads..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Add leads manually or from your website inquiry form."
          icon={Users}
          action={<Button asChild><Link href="/leads/new"><Plus className="h-4 w-4" /> New Lead</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.buyer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{lead.company_name ?? lead.email}</p>
                    </TableCell>
                    <TableCell>{lead.country ?? '-'}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{lead.product_interested ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {lead.lead_value != null ? formatCurrency(lead.lead_value, lead.currency ?? 'USD') : '-'}
                    </TableCell>
                    <TableCell><StatusBadge status={lead.priority} /></TableCell>
                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/leads/${lead.id}`}><Pencil className="h-4 w-4" /> Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive disabled={deleting === lead.id} onClick={() => handleDelete(lead.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === lead.id ? 'Deleting...' : 'Delete'}
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