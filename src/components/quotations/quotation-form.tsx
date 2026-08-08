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
import { formatCurrency } from '@/lib/utils';
import { INCOTERMS, CURRENCIES, COUNTRIES } from '@/lib/constants';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface QuotationItemInitial {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
}

interface QuotationFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    buyerName: string;
    buyerCompany?: string | null;
    buyerEmail?: string | null;
    buyerPhone?: string | null;
    buyerAddress?: string | null;
    buyerCountry?: string | null;
    currency: string;
    incoterm: string;
    paymentTerms?: string | null;
    validityDays: number;
    discount: number;
    freight: number;
    insurance: number;
    taxRate: number;
    notes?: string | null;
    terms?: string | null;
    items: QuotationItemInitial[];
  };
}

export default function QuotationForm(props: QuotationFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [buyerName, setBuyerName] = useState(init?.buyerName ?? '');
  const [buyerCompany, setBuyerCompany] = useState(init?.buyerCompany ?? '');
  const [buyerEmail, setBuyerEmail] = useState(init?.buyerEmail ?? '');
  const [buyerPhone, setBuyerPhone] = useState(init?.buyerPhone ?? '');
  const [buyerAddress, setBuyerAddress] = useState(init?.buyerAddress ?? '');
  const [buyerCountry, setBuyerCountry] = useState(init?.buyerCountry ?? '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [incoterm, setIncoterm] = useState(init?.incoterm ?? 'FOB');
  const [paymentTerms, setPaymentTerms] = useState(init?.paymentTerms ?? '');
  const [validityDays, setValidityDays] = useState(init?.validityDays ?? 30);
  const [discount, setDiscount] = useState(init?.discount ?? 0);
  const [freight, setFreight] = useState(init?.freight ?? 0);
  const [insurance, setInsurance] = useState(init?.insurance ?? 0);
  const [taxRate, setTaxRate] = useState(init?.taxRate ?? 0);
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [terms, setTerms] = useState(init?.terms ?? '');
  const [items, setItems] = useState<LineItem[]>(
    init?.items && init.items.length
      ? init.items.map((i) => ({ id: `init-${i.description}`, description: i.description, quantity: i.quantity, unit: i.unit ?? '', unitPrice: i.unitPrice }))
      : [{ id: 'new', description: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const taxable = subtotal - discount;
  const tax = (taxable * taxRate) / 100;
  const total = taxable + tax + freight + insurance;

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `new-${Date.now()}`, description: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]);
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
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      amount: (i.quantity || 0) * (i.unitPrice || 0)
    }));
    if (validItems.some((i) => !i.description)) {
      toast.error('Every line item needs a description');
      return;
    }

    const payload = {
      buyerName,
      buyerCompany: buyerCompany || null,
      buyerEmail: buyerEmail || null,
      buyerPhone: buyerPhone || null,
      buyerAddress: buyerAddress || null,
      buyerCountry: buyerCountry || null,
      currency,
      incoterm,
      paymentTerms: paymentTerms || null,
      validityDays,
      discount,
      freight,
      insurance,
      taxRate,
      notes: notes || null,
      terms: terms || null,
      items: validItems
    };

    try {
      const res = await api<{ data: { id: string } }>(
        mode === 'edit' && id ? `/api/quotations/${id}` : '/api/quotations',
        { method: mode === 'edit' ? 'PATCH' : 'POST', body: payload }
      );
      toast.success(mode === 'edit' ? 'Quotation updated' : 'Quotation created');
      router.push(`/quotations/${(res.data as { id: string }).id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buyer Details</CardTitle>
          <CardDescription>Who is this quotation for?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buyer Name *</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={buyerCompany} onChange={(e) => setBuyerCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={buyerCountry} onValueChange={setBuyerCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
          <CardDescription>Products and services being quoted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium uppercase text-muted-foreground">
            <div className="col-span-5">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1" />
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 items-center gap-2">
              <Input
                className="col-span-5"
                placeholder="Product / service description"
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
              />
              <Input
                className="col-span-1"
                type="number"
                min={0}
                step="any"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
              <Input
                className="col-span-2"
                placeholder="pcs"
                value={item.unit}
                onChange={(e) => updateItem(index, { unit: e.target.value })}
              />
              <Input
                className="col-span-2"
                type="number"
                min={0}
                step="any"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
              />
              <div className="col-span-1 text-right text-sm tabular-nums">
                {formatCurrency((item.quantity || 0) * (item.unitPrice || 0), currency)}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commercial Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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
            <Label>Validity (days)</Label>
            <Input type="number" min={1} max={365} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Freight</Label>
            <Input type="number" min={0} step="any" value={freight} onChange={(e) => setFreight(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Insurance</Label>
            <Input type="number" min={0} step="any" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} step="any" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Input value={paymentTerms} placeholder="e.g. 50% advance, 50% before shipment" onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes & Total</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="space-y-1.5 rounded-md border p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(discount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{formatCurrency(tax, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Freight</span><span>{formatCurrency(freight, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span>{formatCurrency(insurance, currency)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="min-w-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Quotation'}
        </Button>
      </div>
    </form>
  );
}