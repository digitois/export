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
import { CURRENCIES, COUNTRIES, INVOICE_TYPES } from '@/lib/constants';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

type InvoiceItem = LineItem;

interface InvoiceItemInitial {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
}

interface InvoiceFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    invoiceType: string;
    buyerName: string;
    buyerCompany?: string | null;
    buyerEmail?: string | null;
    buyerAddress?: string | null;
    buyerCountry?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    currency: string;
    paymentTerms?: string | null;
    discount: number;
    taxRate: number;
    shippingCharges: number;
    notes?: string | null;
    items: InvoiceItemInitial[];
  };
}

export default function InvoiceForm(props: InvoiceFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [invoiceType, setInvoiceType] = useState(init?.invoiceType ?? 'commercial');
  const [buyerName, setBuyerName] = useState(init?.buyerName ?? '');
  const [buyerCompany, setBuyerCompany] = useState(init?.buyerCompany ?? '');
  const [buyerEmail, setBuyerEmail] = useState(init?.buyerEmail ?? '');
  const [buyerAddress, setBuyerAddress] = useState(init?.buyerAddress ?? '');
  const [buyerCountry, setBuyerCountry] = useState(init?.buyerCountry ?? '');
  const [invoiceDate, setInvoiceDate] = useState(init?.invoiceDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(init?.dueDate ?? '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [paymentTerms, setPaymentTerms] = useState(init?.paymentTerms ?? '');
  const [discount, setDiscount] = useState(init?.discount ?? 0);
  const [taxRate, setTaxRate] = useState(init?.taxRate ?? 0);
  const [shippingCharges, setShippingCharges] = useState(init?.shippingCharges ?? 0);
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [items, setItems] = useState<InvoiceItem[]>(
    init?.items && init.items.length
      ? init.items.map((i) => ({ id: `init-${i.description}`, description: i.description, quantity: i.quantity, unit: i.unit ?? '', unitPrice: i.unitPrice }))
      : [{ id: 'new', description: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const taxable = subtotal - discount;
  const tax = (taxable * taxRate) / 100;
  const total = taxable + tax + shippingCharges;

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
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
      invoiceType,
      buyerName,
      buyerCompany: buyerCompany || null,
      buyerEmail: buyerEmail || null,
      buyerAddress: buyerAddress || null,
      buyerCountry: buyerCountry || null,
      invoiceDate,
      dueDate: dueDate || null,
      currency,
      paymentTerms: paymentTerms || null,
      discount,
      taxRate,
      shippingCharges,
      notes: notes || null,
      items: validItems
    };

    setSaving(true);
    try {
      const res = await api<{ data: { id: string } }>(
        mode === 'edit' && id ? `/api/invoices/${id}` : '/api/invoices',
        { method: mode === 'edit' ? 'PATCH' : 'POST', body: payload }
      );
      toast.success(mode === 'edit' ? 'Invoice updated' : 'Invoice created');
      router.push(`/invoices/${(res.data as { id: string }).id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
          <CardDescription>Type, dates and payment terms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice Date</Label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
            <Label>Payment Terms</Label>
            <Input value={paymentTerms} placeholder="e.g. 30 days after BL date" onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buyer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Buyer / Consignee Name *</Label>
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
            <Label>Country</Label>
            <Select value={buyerCountry} onValueChange={setBuyerCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
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
                placeholder="Description"
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
          <CardTitle className="text-base">Charges & Total</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Shipping Charges</Label>
            <Input type="number" min={0} step="any" value={shippingCharges} onChange={(e) => setShippingCharges(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} step="any" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5 rounded-md border p-4 text-sm md:col-span-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(discount, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{formatCurrency(tax, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(shippingCharges, currency)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="min-w-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}