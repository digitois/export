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
import { COO_TYPES, COUNTRIES } from '@/lib/constants';

interface CertificateItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitValue: number;
  grossWeightKg: number;
  netWeightKg: number;
}

interface CertificateItemInitial {
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitValue: number;
  grossWeightKg: number;
  netWeightKg: number;
}

interface CertificateFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    certificateType: string;
    shipmentId?: string | null;
    invoiceId?: string | null;
    buyerName: string;
    buyerCompany?: string | null;
    buyerAddress?: string | null;
    buyerCountry?: string | null;
    exporterIec?: string | null;
    countryOfOrigin: string;
    countryOfDestination?: string | null;
    issuedDate: string;
    notes?: string | null;
    items: CertificateItemInitial[];
  };
}

export default function CertificateOfOriginForm(props: CertificateFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [certificateType, setCertificateType] = useState(init?.certificateType ?? 'non_preferential');
  const [buyerName, setBuyerName] = useState(init?.buyerName ?? '');
  const [buyerCompany, setBuyerCompany] = useState(init?.buyerCompany ?? '');
  const [buyerAddress, setBuyerAddress] = useState(init?.buyerAddress ?? '');
  const [buyerCountry, setBuyerCountry] = useState(init?.buyerCountry ?? '');
  const [exporterIec, setExporterIec] = useState(init?.exporterIec ?? '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(init?.countryOfOrigin ?? 'India');
  const [countryOfDestination, setCountryOfDestination] = useState(init?.countryOfDestination ?? '');
  const [issuedDate, setIssuedDate] = useState(init?.issuedDate ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [items, setItems] = useState<CertificateItem[]>(
    init?.items && init.items.length
      ? init.items.map((i) => ({
          id: `init-${i.description}`,
          description: i.description,
          hsnCode: i.hsnCode ?? '',
          quantity: i.quantity,
          unit: i.unit ?? 'pcs',
          unitValue: i.unitValue,
          grossWeightKg: i.grossWeightKg,
          netWeightKg: i.netWeightKg
        }))
      : [{ id: 'new', description: '', hsnCode: '', quantity: 1, unit: 'pcs', unitValue: 0, grossWeightKg: 0, netWeightKg: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const totalValue = items.reduce((s, i) => s + (i.quantity || 0) * (i.unitValue || 0), 0);

  function updateItem(index: number, patch: Partial<CertificateItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `new-${Date.now()}`, description: '', hsnCode: '', quantity: 1, unit: 'pcs', unitValue: 0, grossWeightKg: 0, netWeightKg: 0 }]);
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
      unitValue: i.unitValue,
      grossWeightKg: i.grossWeightKg,
      netWeightKg: i.netWeightKg
    }));
    if (validItems.some((i) => !i.description)) {
      toast.error('Every line item needs a description');
      return;
    }

    const payload = {
      certificateType,
      shipmentId: init?.shipmentId ?? null,
      invoiceId: init?.invoiceId ?? null,
      buyerName,
      buyerCompany: buyerCompany || null,
      buyerAddress: buyerAddress || null,
      buyerCountry: buyerCountry || null,
      exporterIec: exporterIec || null,
      countryOfOrigin,
      countryOfDestination: countryOfDestination || null,
      issuedDate,
      notes: notes || null,
      items: validItems
    };

    setSaving(true);
    try {
      const res = await api<{ data: { id: string } }>(id ? `/api/certificates-of-origin/${id}` : '/api/certificates-of-origin', {
        method: id ? 'PATCH' : 'POST',
        body: payload
      });
      toast.success(id ? 'Certificate updated' : 'Certificate created');
      router.push(`/certificates-of-origin/${res.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate details</CardTitle>
          <CardDescription>Type, parties and origin/export route.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Certificate type</Label>
            <Select value={certificateType} onValueChange={setCertificateType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COO_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exporter IEC</Label>
            <Input value={exporterIec} onChange={(e) => setExporterIec(e.target.value)} placeholder="e.g. 0502021234" />
          </div>
          <div className="space-y-2">
            <Label>Buyer name</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
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
            <Label>Country of origin</Label>
            <Select value={countryOfOrigin} onValueChange={setCountryOfOrigin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country of destination</Label>
            <Select value={countryOfDestination} onValueChange={setCountryOfDestination}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Issued date</Label>
            <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
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
            <CardDescription>Goods covered by this certificate · declared value {totalValue.toFixed(2)}</CardDescription>
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
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Unit value</Label>
                <Input type="number" min={0} step="any" value={item.unitValue} onChange={(e) => updateItem(index, { unitValue: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Gross (kg)</Label>
                <Input type="number" min={0} step="any" value={item.grossWeightKg} onChange={(e) => updateItem(index, { grossWeightKg: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs">Net (kg)</Label>
                <Input type="number" min={0} step="any" value={item.netWeightKg} onChange={(e) => updateItem(index, { netWeightKg: Number(e.target.value) })} />
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
          {mode === 'edit' ? 'Save Changes' : 'Create Certificate'}
        </Button>
      </div>
    </form>
  );
}
