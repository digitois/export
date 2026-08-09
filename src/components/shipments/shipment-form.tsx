'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CURRENCIES, INCOTERMS, SHIPMENT_MODES } from '@/lib/constants';

interface BuyerOption {
  id: string;
  company_name?: string | null;
  contact_person?: string | null;
  country?: string | null;
}

interface ShipmentFormProps {
  shipmentId?: string;
}

interface ShipmentDetail {
  id: string;
  buyer_id?: string | null;
  invoice_id?: string | null;
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
  cargo_description?: string | null;
  weight_kg?: number | null;
  volume_cbm?: number | null;
  no_of_packages: number;
  currency: string;
  freight_charges: number;
  notes?: string | null;
}

export function ShipmentForm({ shipmentId }: ShipmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!shipmentId);
  const [saving, setSaving] = useState(false);
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);

  const [buyerId, setBuyerId] = useState('');
  const [mode, setMode] = useState('sea');
  const [incoterm, setIncoterm] = useState('FOB');
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [blAwbNo, setBlAwbNo] = useState('');
  const [carrier, setCarrier] = useState('');
  const [vessel, setVessel] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [volumeCbm, setVolumeCbm] = useState('');
  const [noOfPackages, setNoOfPackages] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [freightCharges, setFreightCharges] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    apiData<{ items: BuyerOption[] }>('/api/buyers?pageSize=100')
      .then((res) => setBuyers(res.items))
      .catch(() => setBuyers([]));
  }, []);

  useEffect(() => {
    if (!shipmentId) return;
    let cancelled = false;
    apiData<ShipmentDetail>(`/api/shipments/${shipmentId}`)
      .then((d) => {
        if (cancelled) return;
        setBuyerId(d.buyer_id ?? '');
        setMode(d.mode ?? 'sea');
        setIncoterm(d.incoterm ?? 'FOB');
        setOriginPort(d.origin_port ?? '');
        setDestinationPort(d.destination_port ?? '');
        setContainerNo(d.container_no ?? '');
        setBlAwbNo(d.bl_awb_no ?? '');
        setCarrier(d.carrier ?? '');
        setVessel(d.vessel ?? '');
        setEtd(d.etd ?? '');
        setEta(d.eta ?? '');
        setCargoDescription(d.cargo_description ?? '');
        setWeightKg(d.weight_kg != null ? String(d.weight_kg) : '');
        setVolumeCbm(d.volume_cbm != null ? String(d.volume_cbm) : '');
        setNoOfPackages(String(d.no_of_packages ?? 0));
        setCurrency(d.currency ?? 'USD');
        setFreightCharges(String(d.freight_charges ?? 0));
        setNotes(d.notes ?? '');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load shipment'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shipmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      buyerId: buyerId || null,
      mode,
      incoterm,
      originPort: originPort || null,
      destinationPort: destinationPort || null,
      containerNo: containerNo || null,
      blAwbNo: blAwbNo || null,
      carrier: carrier || null,
      vessel: vessel || null,
      etd: etd || null,
      eta: eta || null,
      cargoDescription: cargoDescription || null,
      weightKg: weightKg === '' ? null : Number(weightKg),
      volumeCbm: volumeCbm === '' ? null : Number(volumeCbm),
      noOfPackages: Number(noOfPackages || 0),
      currency,
      freightCharges: Number(freightCharges || 0),
      notes: notes || null
    };
    try {
      const res = await apiData<{ id: string }>(shipmentId ? `/api/shipments/${shipmentId}` : '/api/shipments', {
        method: shipmentId ? 'PATCH' : 'POST',
        body
      });
      toast.success(shipmentId ? 'Shipment updated' : 'Shipment created');
      router.push(`/shipments/${res.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save shipment');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route & Carrier</CardTitle>
          <CardDescription>Consignment movement details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buyer</Label>
            <Select value={buyerId} onValueChange={setBuyerId}>
              <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
              <SelectContent>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.company_name || b.contact_person || 'Buyer'}
                    {b.country ? ` · ${b.country}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHIPMENT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Incoterm</Label>
            <Select value={incoterm} onValueChange={setIncoterm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOTERMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Origin Port</Label>
            <Input value={originPort} onChange={(e) => setOriginPort(e.target.value)} placeholder="e.g. Mundra" />
          </div>
          <div className="space-y-2">
            <Label>Destination Port</Label>
            <Input value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} placeholder="e.g. Rotterdam" />
          </div>
          <div className="space-y-2">
            <Label>Carrier</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Maersk" />
          </div>
          <div className="space-y-2">
            <Label>Vessel / Flight</Label>
            <Input value={vessel} onChange={(e) => setVessel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Container No.</Label>
            <Input value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="e.g. MSKU1234567" />
          </div>
          <div className="space-y-2">
            <Label>B/L or AWB No.</Label>
            <Input value={blAwbNo} onChange={(e) => setBlAwbNo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ETD</Label>
            <Input type="date" value={etd} onChange={(e) => setEtd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ETA</Label>
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cargo & Charges</CardTitle>
          <CardDescription>Package details and freight cost.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Cargo Description</Label>
            <Textarea rows={2} value={cargoDescription} onChange={(e) => setCargoDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" min={0} step="0.01" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Volume (cbm)</Label>
            <Input type="number" min={0} step="0.01" value={volumeCbm} onChange={(e) => setVolumeCbm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>No. of Packages</Label>
            <Input type="number" min={0} value={noOfPackages} onChange={(e) => setNoOfPackages(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Freight Charges</Label>
            <Input type="number" min={0} step="0.01" value={freightCharges} onChange={(e) => setFreightCharges(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {shipmentId ? 'Save Changes' : 'Create Shipment'}
        </Button>
      </div>
    </form>
  );
}
