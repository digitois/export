'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, CheckCircle, MoreHorizontal, Trash2, Pencil, AlertCircle } from 'lucide-react';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { CONTRACT_STATUSES } from '@/lib/constants';

interface ContractRow {
  id: string;
  title: string;
  status: string;
  value?: number | null;
  currency: string;
  signed_at?: string | null;
  expires_at?: string | null;
  lead?: { id: string; buyer_name: string; company_name?: string | null };
  created_at: string;
}

export default function ContractsPage() {
  const [items, setItems] = useState<ContractRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: ContractRow[]; meta: { count: number } }>(
      `/api/contracts${getSearchParamString({ page, pageSize, q, status })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load contracts'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, q, status]);

  async function handleSign(id: string) {
    try {
      await api(`/api/contracts/${id}`, { method: 'PATCH', body: { sign: true } });
      toast.success('Contract signed');
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'signed', signed_at: new Date().toISOString() } : c)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign contract');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this contract?')) return;
    setDeleting(id);
    try {
      await api(`/api/contracts/${id}`, { method: 'DELETE' });
      toast.success('Contract deleted');
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) return <Loading label="Loading contracts..." />;
  if (items.length === 0) return (
    <div className="space-y-6">
      <PageHeader title="Contracts" description="Manage contracts and agreements">
        <Button asChild>
          <Link href="/leads/new"><Plus className="h-4 w-4" /> New Lead</Link>
        </Button>
      </PageHeader>
      <EmptyState icon={FileText} title="No contracts yet" description="Create contracts from leads." action={<Button asChild><Link href="/leads/new"><Plus className="h-4 w-4" /> New Lead</Link></Button>} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" description="Track contracts and agreements">
        <Button asChild>
          <Link href="/leads/new">
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search contracts..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="md:max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v === 'all-statuses' ? '' : v); setPage(1); }}>
              <SelectTrigger className="md:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                {CONTRACT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} contract{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/leads/${c.lead?.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.lead?.buyer_name}
                    {c.lead?.company_name && <p className="text-xs text-muted-foreground">{c.lead.company_name}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.value ? formatCurrency(c.value, c.currency) : '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm">{c.signed_at ? formatDate(c.signed_at) : '—'}</TableCell>
                  <TableCell className="text-sm">{c.expires_at ? formatDate(c.expires_at) : '—'}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.status !== 'signed' && (
                            <DropdownMenuItem onClick={() => handleSign(c.id)}>
                              <CheckCircle className="h-4 w-4" /> Sign
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${c.lead?.id}`}><Pencil className="h-4 w-4" /> View Lead</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive disabled={deleting === c.id} onClick={() => handleDelete(c.id)}>
                            <Trash2 className="h-4 w-4" /> {deleting === c.id ? 'Deleting...' : 'Delete'}
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