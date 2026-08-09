'use client';

import { useEffect, useState } from 'react';
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
import { round2 } from '@/lib/services/landed-cost';
import { formatCurrency } from '@/lib/utils';
import { COUNTRIES, CURRENCIES, PURCHASE_ORDER_STATUSES } from '@/lib/constants';

interface POItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

interface POItemInitial {
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  taxRate: number;
}

interface POFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    supplierId?: string | null;
    supplierName: string;
    supplierCompany?: string | null;
    supplierAddress?: string | null;
    supplierCountry?: string | null;
    warehouseId?: string | null;
    currency: string;
    orderDate: string;
    expectedDate?: string | null;
    discount: number;
    taxRate: number;
    shippingCharges: number;
    notes?: string | null;
    terms?: string | null;
    items: POItemInitial[];
  };
}

export default function PurchaseOrderForm(props: POFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [supplierId, setSupplierId] = useState(init?.supplierId ?? '');
  const [supplierName, setSupplierName] = useState(init?.supplierName ?? '');
  const [supplierCompany, setSupplierCompany] = useState(init?.supplierCompany ?? '');
  const [supplierAddress, setSupplierAddress] = useState(init?.supplierAddress ?? '');
  const [supplierCountry, setSupplierCountry] = useState(init?.supplierCountry ?? '');
  const [warehouseId, setWarehouseId] = useState(init?.warehouseId ?? '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [orderDate, setOrderDate] = useState(init?.orderDate ?? new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState(init?.expectedDate ?? '');
  const [discount, setDiscount] = useState(init?.discount ?? 0);
  const [taxRate, setTaxRate] = useState(init?.taxRate ?? 0);
  const [shippingCharges, setShippingCharges] = useState(init?.shippingCharges ?? 0);
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [terms, setTerms] = useState(init?.terms ?? '');
  const [items, setItems] = useState<POItem[]>(
    init?.items && init.items.length
      ? init.items.map((i) => ({ id: `init-${i.description}`, description: i.description, hsnCode: i.hsnCode ?? '', quantity: i.quantity, unit: i.unit ?? 'pcs', unitPrice: i.unitPrice, taxRate: i.taxRate, amount: round2(i.quantity * i.unitPrice) }))
      : [{ id: 'new', description: '', hsnCode: '', quantity: 1, unit: 'pcs', unitPrice: 0, taxRate: 0, amount: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxable = subtotal - discount;
  const tax = round2((taxable * taxRate) / 100);
  const total = round2(taxable + tax + shippingCharges);

  useEffect(() => {
    api<{ data: Array<{ id: string; name: string }> }>('/api/suppliers?pageSize=200').then((r) => setSuppliers(r.data)).catch(() => {});
    api<{ data: Array<{ id: string; name: string }> }>('/api/warehouses').then((r) => setWarehouses(r.data)).catch(() => {});
  }, []);

  function updateItem(index: number, patch: Partial<POItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch, amount: round2((patch.quantity ?? it.quantity) * (patch.unitPrice ?? it.unitPrice)) } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: `new-${Date.now()}`, description: '', hsnCode: '', quantity: 1, unit: 'pcs', unitPrice: 0, taxRate: 0, amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierName.trim()) { toast.error('Supplier name is required'); return; }
    const validItems = items.map((i) => ({ description: i.description.trim(), hsnCode: i.hsnCode || null, quantity: i.quantity, unit: i.unit || null, unitPrice: i.unitPrice, taxRate: i.taxRate }));
    if (validItems.some((i) => !i.description)) { toast.error('Every line item needs a description'); return; }

    const body = { supplierId: supplierId || null, supplierName, supplierCompany: supplierCompany || null, supplierAddress: supplierAddress || null, supplierCountry: supplierCountry || null, warehouseId: warehouseId || null, currency, orderDate, expectedDate: expectedDate || null, discount, taxRate, shippingCharges, notes: notes || null, terms: terms || null, items: validItems };

    setSaving(true);
    try {
      const res = await api<{ data: { id: string } }>(id ? `/api/purchase-orders/${id}` : '/api/purchase-orders', { method: id ? 'PATCH' : 'POST', body });
      toast.success(id ? 'Purchase order updated' : 'Purchase order created');
      router.push(`/purchase-orders/${res.data.id}`);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save purchase order'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card><CardHeader><CardTitle className="text-base">Supplier & Delivery</CardTitle><CardDescription>Vendor and warehouse for this purchase order.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Supplier</Label><Select value={supplierName} onValueChange={setSupplierName}><SelectTrigger><SelectValue placeholder="Search or enter supplier name" /></SelectTrigger><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Supplier company</Label><Input value={supplierCompany} onChange={(e) => setSupplierCompany(e.target.value)} /></div>
        <div className="space-y-2"><Label>Supplier address</Label><Input value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} /></div>
        <div className="space-y-2"><Label>Supplier country</Label><Select value={supplierCountry} onValueChange={setSupplierCountry}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Warehouse</Label><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger><SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Order date</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Expected date</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">Line items</CardTitle></div><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4" /> Add item</Button></CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-line p-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-3"><Label className="text-xs">Description</Label><Input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label className="text-xs">HS Code</Label><Input value={item.hsnCode} onChange={(e) => updateItem(index, { hsnCode: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-1"><Label className="text-xs">Qty</Label><Input type="number" min={0} step="any" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} /></div>
            <div className="space-y-2 md:col-span-1"><Label className="text-xs">Unit</Label><Input value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-1"><Label className="text-xs">Unit price</Label><Input type="number" min={0} step="any" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} /></div>
            <div className="space-y-2 md:col-span-1"><Label className="text-xs">Tax %</Label><Input type="number" min={0} max={100} step="any" value={item.taxRate} onChange={(e) => updateItem(index, { taxRate: Number(e.target.value) })} /></div>
            <div className="space-y-2 md:col-span-1"><Label className="text-xs">Amount</Label><Input type="number" readOnly value={item.amount} className="bg-muted" /></div>
            <div className="flex items-end justify-end md:col-span-1"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
        {items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No items. Add the first one.</p>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{formatCurrency(subtotal, currency)}</p></div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Discount</p><p className="font-semibold">{formatCurrency(discount, currency)}</p></div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Tax ({taxRate}%)</p><p className="font-semibold">{formatCurrency(tax, currency)}</p></div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Shipping</p><p className="font-semibold">{formatCurrency(shippingCharges, currency)}</p></div>
        <div className="space-y-1 md:col-span-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{formatCurrency(total, currency)}</p></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Terms & Notes</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Notes (internal)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Terms (on PO)</Label><Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
      </CardContent></Card>

      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {mode === 'edit' ? 'Save Changes' : 'Create Purchase Order'}</Button></div>
    </form>
  );
}