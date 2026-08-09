'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CURRENCIES, COUNTRIES } from '@/lib/constants';

interface PackingItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  packageCount: number;
  weightKg: number;
  volumeCbm: number;
}

interface PackingItemInitial {
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  packageCount: number;
  weightKg: number;
  volumeCbm: number;
}

interface PackingListFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    shipmentId?: string | null;
    invoiceId?: string | null;
    buyerName: string;
    buyerCompany?: string | null;
    buyerAddress?: string | null;
    buyerCountry?: string | null;
    containerNo?: string | null;
    blAwbNo?: string | null;
    portOfLoading?: string | null;
    portOfDischarge?: string | null;
    vessel?: string | null;
    currency: string;
    notes?: string | null;
    items: PackingItemInitial[];
  };
}

export default function PackingListForm(props: PackingListFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [buyerName, setBuyerName] = useState(init?.buyerName ?? '');
  const [buyerCompany, setBuyerCompany] = useState(init?.buyerCompany ?? '');
  const [buyerAddress, setBuyerAddress] = useState(init?.buyerAddress ?? '');
  const [buyerCountry, setBuyerCountry] = useState(init?.buyerCountry ?? '');
  const [containerNo, setContainerNo] = useState(init?.containerNo ?? '');
  const [blAwbNo, setBlAwbNo] = useState(init?.blAwbNo ?? '');
  const [portOfLoading, setPortOfLoading] = useState(init?.portOfLoading ?? '');
  const [portOfDischarge, setPortOfDischarge] = useState(init?.portOfDischarge ?? '');
  const [vessel, setVessel] = useState(init?.vessel ?? '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [items, setItems] = useState<PackingItem[]>(
    init?.items && init.items.length
      ? init.items.map((i) => ({
          id: `init-${i.description}`,
          description: i.description,
          hsnCode: i.hsnCode ?? '',
          quantity: i.quantity,
          unit: i.unit ?? 'pcs',
          packageCount: i.packageCount,
          weightKg: i.weightKg,
          volumeCbm: i.volumeCbm
        }))
      : [{ id: 'new', description: '', hsnCode: '', quantity: 1, unit: 'pcs', packageCount: 1, weightKg: 0, volumeCbm: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const totalPackages = items.reduce((s, i) => s + (i.packageCount || 0), 0);
  const totalWeight = items.reduce((s, i) => s + (i.weightKg || 0), 0);
  const totalVolume = items.reduce((s, i) => s + (i.volumeCbm || 0), 0);

  function updateItem(index: number, patch: Partial<PackingItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `new-${Date.now()}`, description: '', hsnCode: '', quantity: 1, unit: 'pcs', packageCount: 1, weightKg: 0, volumeCbm: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buyerName.trim()) {
      toast.error('Buyer name is required');
      return;
    }
    const validItems = items.map((i) => ({
      description: i.description.trim(),
      hsnCode: i.hsnCode || null,
      quantity: i.quantity,
      unit: i.unit || null,
      packageCount: i.packageCount,
      weightKg: i.weightKg,
      volumeCbm: i.volumeCbm
    }));
    if (validItems.some((i) => !i.description)) {
      toast.error('Every line item needs a description');
      return;
    }

    const payload = {
      shipmentId: init?.shipmentId ?? null,
      invoiceId: init?.invoiceId ?? null,
      buyerName,
      buyerCompany: buyerCompany || null,
      buyerAddress: buyerAddress || null,
      buyerCountry: buyerCountry || null,
      containerNo: containerNo || null,
      blAwbNo: blAwbNo || null,
      portOfLoading: portOfLoading || null,
      portOfDischarge: portOfDischarge || null,
      vessel: vessel || null,
      currency,
      notes: notes || null,
      items: validItems
    };

    setSaving(true);
    try {
      const res = await api<{ data: { id: string } }>(id ? `/api/packing-lists/${id}` : '/api/packing-lists', {
        method: id ? 'PATCH' : 'POST',
        body: payload
      });
      toast.success(id ? 'Packing list updated' : 'Packing list created');
      router.push(`/packing-lists/${res.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save packing list');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consignment details</CardTitle>
          <CardDescription>Route, container and buyer information for this packing list.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buyer name</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer name" />
          </div>
          <div className="space-y-2">
            <Label>Buyer company</Label>
            <Input value={buyerCompany} onChange={(e) => setBuyerCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Buyer address</Label>
            <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Buyer country</Label>
            <Select value={buyerCountry} onValueChange={setBuyerCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Port of loading</Label>
            <Input value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} placeholder="e.g. Mundra" />
          </div>
          <div className="space-y-2">
            <Label>Port of discharge</Label>
            <Input value={portOfDischarge} onChange={(e) => setPortOfDischarge(e.target.value)} placeholder="e.g. Rotterdam" />
          </div>
          <div className="space-y-2">
            <Label>Vessel</Label>
            <Input value={vessel} onChange={(e) => setVessel(e.target.value)} />
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
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Line items</CardTitle>
            <CardDescription>
              {totalPackages} package{totalPackages !== 1 && 's'} · {totalWeight.toFixed(2)} kg · {totalVolume.toFixed(2)} cbm
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-line p-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-3">
                <Label className="text-xs">Description</Label>
                <Input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">HS Code</Label>
                <Input value={item.hsnCode} onChange={(e) => updateItem(index, { hsnCode: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={0} step="any" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Unit</Label>
                <Input value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Packages</Label>
                <Input type="number" min={1} value={item.packageCount} onChange={(e) => updateItem(index, { packageCount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" min={0} step="any" value={item.weightKg} onChange={(e) => updateItem(index, { weightKg: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Vol (cbm)</Label>
                <Input type="number" min={0} step="any" value={item.volumeCbm} onChange={(e) => updateItem(index, { volumeCbm: Number(e.target.value) })} />
              </div>
              <div className="flex items-end justify-end md:col-span-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No items. Add the first one.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Packing List'}
        </Button>
      </div>
    </form>
  );
}
