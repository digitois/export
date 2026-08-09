'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Ship } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { SHIPMENT_STATUSES, SHIPMENT_MODES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ShipmentRow {
  id: string;
  shipment_number: string;
  buyer_name?: string | null;
  buyer_company?: string | null;
  buyer_country?: string | null;
  mode: string;
  incoterm: string;
  origin_port?: string | null;
  destination_port?: string | null;
  container_no?: string | null;
  bl_awb_no?: string | null;
  eta?: string | null;
  etd?: string | null;
  status: string;
}

const COLUMNS = SHIPMENT_STATUSES;

export default function ShipmentsKanbanPage() {
  const [items, setItems] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ data: ShipmentRow[] }>('/api/shipments?pageSize=100')
      .then((res) => {
        if (!cancelled) setItems(res.data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load shipments'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function moveTo(shipment: ShipmentRow, status: string) {
    try {
      await api(`/api/shipments/${shipment.id}`, { method: 'PATCH', body: { status } });
      setItems((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, status } : s)));
      toast.success(`Moved to ${status.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shipment');
    }
  }

  if (loading) return <Loading label="Loading shipments..." />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Shipments" description="Track consignments through the customs journey" />
        <EmptyState
          title="No shipments yet"
          description="Create your first consignment to track it from booking to delivery."
          icon={Ship}
          action={<Button asChild><Link href="/shipments/new"><Plus className="h-4 w-4" /> New Shipment</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Shipments" description="Consignment tracking across the customs journey">
        <Button asChild>
          <Link href="/shipments/new">
            <Plus className="h-4 w-4" />
            New Shipment
          </Link>
        </Button>
      </PageHeader>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((s) => s.status === col.value);
          return (
            <div key={col.value} className="flex w-72 shrink-0 flex-col rounded-xl border border-line bg-canvas/60">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={col.value} />
                  <span className="text-xs tabular-nums text-muted-foreground">{colItems.length}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 px-3 pb-3">
                {colItems.map((shipment) => (
                  <Card key={shipment.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/shipments/${shipment.id}`} className="font-semibold hover:underline">
                          {shipment.shipment_number}
                        </Link>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {SHIPMENT_MODES.find((m) => m.value === shipment.mode)?.label ?? shipment.mode} · {shipment.incoterm}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {shipment.buyer_company || shipment.buyer_name || 'Buyer'}
                        {shipment.buyer_country ? ` · ${shipment.buyer_country}` : ''}
                      </p>
                      {(shipment.origin_port || shipment.destination_port) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {shipment.origin_port ?? '—'} → {shipment.destination_port ?? '—'}
                        </p>
                      )}
                      {shipment.eta && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ETA {formatDate(shipment.eta)}
                        </p>
                      )}
                      <div className="mt-3 flex gap-1.5">
                        {COLUMNS.filter((c) => c.value !== shipment.status).map((c) => (
                          <button
                            key={c.value}
                            onClick={() => moveTo(shipment, c.value)}
                            className={cn(
                              'h-1.5 flex-1 rounded-full transition-colors',
                              c.value === 'delivered' || c.value === 'cleared'
                                ? 'bg-pos/25 hover:bg-pos'
                                : c.value === 'held' || c.value === 'cancelled'
                                  ? 'bg-neg/25 hover:bg-neg'
                                  : 'bg-muted-foreground/20 hover:bg-info'
                            )}
                            title={`Move to ${c.label}`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colItems.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">No shipments</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
