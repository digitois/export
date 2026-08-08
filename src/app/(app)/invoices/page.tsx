'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, FileText, MoreHorizontal, FileDown } from 'lucide-react';
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
import { INVOICE_STATUSES, INVOICE_TYPES } from '@/lib/constants';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: string;
  buyer_name: string;
  buyer_company?: string | null;
  currency: string;
  total: number;
  status: string;
  invoice_date: string;
  due_date?: string | null;
}

export default function InvoicesIndexPage() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: InvoiceRow[]; meta: { count: number; totalPages: number } }>(
      `/api/invoices${getSearchParamString({ page, pageSize, q, status, type })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load invoices'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, status, type]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api(`/api/invoices/${id}`, { method: 'DELETE' });
      toast.success('Invoice deleted');
      setItems((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Create and manage export invoices">
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search invoice number or buyer..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="md:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="md:w-48"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                {INVOICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} invoice{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading invoices..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create invoices for your confirmed export orders."
          icon={FileText}
          action={
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="h-4 w-4" />
                New Invoice
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
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {INVOICE_TYPES.find((t) => t.value === invoice.invoice_type)?.label ?? invoice.invoice_type}
                      </p>
                    </TableCell>
                    <TableCell>
                      {invoice.buyer_name}
                      {invoice.buyer_company && <p className="text-xs text-muted-foreground">{invoice.buyer_company}</p>}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total, invoice.currency ?? 'USD')}</TableCell>
                    <TableCell><StatusBadge status={invoice.status} /></TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.invoice_date)}</TableCell>
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
                              <Link href={`/invoices/${invoice.id}`}><Pencil className="h-4 w-4" /> Open / Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                                <FileDown className="h-4 w-4" /> Download PDF
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === invoice.id} onClick={() => handleDelete(invoice.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === invoice.id ? 'Deleting...' : 'Delete'}
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