'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Ship } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SHIPMENT_STATUSES, SHIPMENT_MODES } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

interface ShipmentEvent {
  id: string;
  stage: string;
  note?: string | null;
  occurred_at: string;
}

interface ShipmentDetail {
  id: string;
  shipment_number: string;
  buyer?: { company_name?: string; contact_person?: string; country?: string } | null;
  buyer_name?: string | null;
  buyer_company?: string | null;
  buyer_country?: string | null;
  mode: string;
  incoterm: string;
  origin_port?: string | null;
  destination_port?: string | null;
  container_no?: string | null;
  bl_awb_no?: string | null;
  carrier?: string | null;
  vessel?: string | null;
  etd?: string | null;
  eta?: string | null;
  actual_departure?: string | null;
  actual_arrival?: string | null;
  status: string;
  cargo_description?: string | null;
  weight_kg?: number | null;
  volume_cbm?: number | null;
  no_of_packages: number;
  currency: string;
  freight_charges: number;
  notes?: string | null;
  events?: ShipmentEvent[];
}

const JOURNEY = ['booked', 'in_transit', 'at_customs', 'cleared', 'delivered'];

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newEventStage, setNewEventStage] = useState('in_transit');
  const [newEventNote, setNewEventNote] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id)).catch(() => null);
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiData<ShipmentDetail>(`/api/shipments/${id}`)
      .then((d) => {
        if (!cancelled) setShipment(d);
      })
      .catch(() => {
        if (!cancelled) setShipment(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <Loading />;
  if (loading) return <Loading label="Loading shipment..." />;
  if (!shipment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Shipment not found" />
        <Button asChild variant="outline"><Link href="/shipments"><ArrowLeft className="h-4 w-4" /> Back to shipments</Link></Button>
      </div>
    );
  }

  async function changeStatus(status: string) {
    try {
      await api(`/api/shipments/${id}`, { method: 'PATCH', body: { status } });
      setShipment((prev) => (prev ? { ...prev, status } : prev));
      toast.success('Status updated');
      const res = await apiData<ShipmentDetail>(`/api/shipments/${id}`);
      setShipment(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function addEvent() {
    if (!newEventNote.trim()) return;
    setAddingEvent(true);
    try {
      await api(`/api/shipments/${id}/events`, {
        method: 'POST',
        body: { shipmentId: id, stage: newEventStage, note: newEventNote }
      });
      setNewEventNote('');
      const res = await apiData<ShipmentDetail>(`/api/shipments/${id}`);
      setShipment(res);
      toast.success('Event added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event');
    } finally {
      setAddingEvent(false);
    }
  }

  async function deleteShipment() {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/api/shipments/${id}`, { method: 'DELETE' });
      toast.success('Shipment deleted');
      router.push('/shipments');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete shipment');
      setDeleting(false);
    }
  }

  const journeyIndex = JOURNEY.indexOf(shipment.status);
  const isHeld = shipment.status === 'held';
  const isCancelled = shipment.status === 'cancelled';

  return (
    <div className="space-y-6">
      <PageHeader title={shipment.shipment_number} description={`${shipment.buyer_company || shipment.buyer_name || 'Shipment'}${shipment.buyer_country ? ` · ${shipment.buyer_country}` : ''}`}>
        <Button asChild variant="outline"><Link href="/shipments"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Button variant="destructive" disabled={deleting} onClick={deleteShipment}>
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </PageHeader>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customs Journey</CardTitle>
            <CardDescription>Move the consignment through each stage.</CardDescription>
          </CardHeader>
          <CardContent>
            {isCancelled ? (
              <p className="text-sm text-muted-foreground">This shipment was cancelled.</p>
            ) : isHeld ? (
              <div className="space-y-4">
                <StatusBadge status="held" />
                <div className="flex flex-wrap gap-2">
                  {JOURNEY.map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
                      {SHIPMENT_STATUSES.find((x) => x.value === s)?.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {JOURNEY.map((s, i) => {
                    const reached = i <= journeyIndex;
                    const current = i === journeyIndex;
                    return (
                      <div key={s} className="flex flex-1 items-center gap-2">
                        <button
                          onClick={() => changeStatus(s)}
                          className={cn(
                            'flex-1 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
                            current
                              ? 'border-primary bg-accent-weak text-primary'
                              : reached
                                ? 'border-line bg-muted/40 text-foreground hover:border-primary/40'
                                : 'border-line text-muted-foreground hover:border-primary/40'
                          )}
                        >
                          <StatusBadge status={s} />
                        </button>
                        {i < JOURNEY.length - 1 && (
                          <div className={cn('h-px w-3', reached ? 'bg-primary' : 'bg-line')} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Tap a stage to update status. Each move is logged to the timeline.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail label="Mode" value={SHIPMENT_MODES.find((m) => m.value === shipment.mode)?.label ?? shipment.mode} />
              <Detail label="Incoterm" value={shipment.incoterm} />
              <Detail label="Origin" value={shipment.origin_port ?? '-'} />
              <Detail label="Destination" value={shipment.destination_port ?? '-'} />
              <Detail label="Carrier" value={shipment.carrier ?? '-'} />
              <Detail label="Vessel / Flight" value={shipment.vessel ?? '-'} />
              <Detail label="Container" value={shipment.container_no ?? '-'} />
              <Detail label="B/L or AWB" value={shipment.bl_awb_no ?? '-'} />
              <Detail label="ETD" value={formatDate(shipment.etd)} />
              <Detail label="ETA" value={formatDate(shipment.eta)} />
              <Detail label="Weight" value={shipment.weight_kg != null ? `${shipment.weight_kg} kg` : '-'} />
              <Detail label="Volume" value={shipment.volume_cbm != null ? `${shipment.volume_cbm} cbm` : '-'} />
              <Detail label="Packages" value={String(shipment.no_of_packages ?? 0)} />
              <Detail label="Freight" value={formatCurrency(shipment.freight_charges, shipment.currency)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
              <CardDescription>All events logged against this consignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={newEventStage} onValueChange={setNewEventStage}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Add a note or event..." value={newEventNote} onChange={(e) => setNewEventNote(e.target.value)} />
                  <Button onClick={addEvent} disabled={addingEvent || !newEventNote.trim()}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: use the journey stepper above to change status; this adds milestone events to the timeline.
                </p>
              </div>
              {!shipment.events?.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-line pl-4">
                  {[...(shipment.events ?? [])].reverse().map((event) => (
                    <li key={event.id} className="relative">
                      <span className={cn('absolute -left-[21px] top-1 h-2 w-2 rounded-full border-2 border-background', 'bg-pos')} />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.stage} />
                        <span className="text-xs text-muted-foreground">{formatDate(event.occurred_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      {event.note && <p className="mt-1 text-sm">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {shipment.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{shipment.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Ship className="h-4 w-4" />
          Created as part of your export pipeline — link invoices and quotations to shipments as they move.
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
