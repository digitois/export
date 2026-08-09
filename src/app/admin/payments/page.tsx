'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentRow {
  id: string;
  organization_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  description?: string | null;
  created_at: string;
  organizations?: { name?: string } | null;
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: PaymentRow[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/payments${getSearchParamString({ page, pageSize })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Every payment captured on the platform." />
      <p className="text-sm text-muted-foreground">{count} payment{count !== 1 && 's'}</p>

      {loading ? (
        <Loading label="Loading payments..." />
      ) : items.length === 0 ? (
        <EmptyState title="No payments yet" description="Payments will appear here as organizations transact." icon={ReceiptText} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.organizations?.name ?? '-'}</TableCell>
                    <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{payment.method ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</TableCell>
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