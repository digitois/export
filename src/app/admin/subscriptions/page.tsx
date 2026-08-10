'use client';

import { useCallback, useEffect, useState } from 'react';
import { Repeat, Ban, Loader2 } from 'lucide-react';
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

interface SubscriptionRow {
  id: string;
  status: string;
  billing_cycle: string;
  cancel_at_period_end: boolean;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at: string;
  plans?: { name?: string; price_monthly?: number; price_annual?: number } | null;
  organizations?: { name?: string } | null;
}

export default function AdminSubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: SubscriptionRow[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/subscriptions${getSearchParamString({ page, pageSize })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel(sub: SubscriptionRow, cancelAtPeriodEnd: boolean) {
    const action = cancelAtPeriodEnd ? 'cancel at period end' : 'cancel immediately';
    if (!window.confirm(`Cancel this subscription (${action})?`)) return;
    setBusyId(sub.id);
    try {
      await api(`/api/admin/subscriptions/${sub.id}`, { method: 'PATCH', body: { cancelAtPeriodEnd } });
      toast.success('Subscription updated');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="All plan subscriptions across the platform" />
      <p className="text-sm text-muted-foreground">{count} subscription{count !== 1 && 's'}</p>

      {loading ? (
        <Loading label="Loading subscriptions..." />
      ) : items.length === 0 ? (
        <EmptyState icon={Repeat} title="No subscriptions yet" description="Subscriptions will appear here as organizations sign up." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.organizations?.name ?? '-'}</TableCell>
                    <TableCell>{sub.plans?.name ?? '-'}</TableCell>
                    <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sub.status} />
                        {sub.cancel_at_period_end && <span className="text-xs text-warn">cancelling at period end</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.current_period_start ? `${formatDate(sub.current_period_start)} → ${sub.current_period_end ? formatDate(sub.current_period_end) : '—'}` : `Started ${formatDate(sub.created_at)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {sub.status === 'active' && (
                          <>
                            <Button variant="ghost" size="sm" disabled={busyId === sub.id} onClick={() => handleCancel(sub, true)}>
                              {busyId === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat className="h-3.5 w-3.5" />}
                              Cancel at period end
                            </Button>
                            <Button variant="ghost" size="sm" className="text-neg" disabled={busyId === sub.id} onClick={() => handleCancel(sub, false)}>
                              <Ban className="h-3.5 w-3.5" /> Cancel now
                            </Button>
                          </>
                        )}
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
