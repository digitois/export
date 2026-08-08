'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ReceiptText, MoreHorizontal, FileDown } from 'lucide-react';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTATION_STATUSES } from '@/lib/constants';

interface QuotationRow {
  id: string;
  quotation_number: string;
  buyer_name: string;
  buyer_company?: string | null;
  buyer_country?: string | null;
  currency: string;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at?: string | null;
}

export default function QuotationsIndexPage() {
  const [items, setItems] = useState<QuotationRow[]>([]);
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
    api<{ data: QuotationRow[]; meta: { count: number; totalPages: number } }>(
      `/api/quotations${getSearchParamString({ page, pageSize, q, status })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load quotations'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, status]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this quotation? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api(`/api/quotations/${id}`, { method: 'DELETE' });
      toast.success('Quotation deleted');
      setItems((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quotation');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" description="Create and send professional export quotations">
        <Button asChild>
          <Link href="/quotations/new">
            <Plus className="h-4 w-4" />
            New Quotation
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search quotation number or buyer..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="md:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                {QUOTATION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} quotation{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading quotations..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Create quotations from your products and send them to buyers."
          icon={ReceiptText}
          action={
            <Button asChild>
              <Link href="/quotations/new">
                <Plus className="h-4 w-4" />
                New Quotation
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link href={`/quotations/${quote.id}`} className="font-medium hover:underline">
                        {quote.quotation_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {quote.buyer_name}
                      <p className="text-xs text-muted-foreground">
                        {quote.buyer_company ?? ''}{quote.buyer_company && quote.buyer_country ? ' · ' : ''}{quote.buyer_country}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(quote.total, quote.currency ?? 'USD')}</TableCell>
                    <TableCell><StatusBadge status={quote.status} /></TableCell>
                    <TableCell className="text-sm">
                      {quote.expires_at ? formatDate(quote.expires_at) : '-'}
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
                            <DropdownMenuItem asChild>
                              <Link href={`/quotations/${quote.id}`}><Pencil className="h-4 w-4" /> Open / Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/api/quotations/${quote.id}/pdf`} target="_blank" rel="noreferrer">
                                <FileDown className="h-4 w-4" /> Download PDF
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === quote.id} onClick={() => handleDelete(quote.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === quote.id ? 'Deleting...' : 'Delete'}
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