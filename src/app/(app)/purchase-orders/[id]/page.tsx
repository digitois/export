'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Truck, CheckCircle, MoreHorizontal } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PURCHASE_ORDER_STATUSES } from '@/lib/constants';
import PurchaseOrderForm from '@/components/purchase-orders/purchase-order-form';

interface PODetail {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_company?: string | null;
  supplier_address?: string | null;
  supplier_country?: string | null;
  warehouse_id?: string | null;
  currency: string;
  status: string;
  order_date: string;
  expected_date?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  tax_rate: number;
  shipping_charges: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  created_at: string;
  items?: Array<{
    id: string;
    product_id?: string | null;
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit?: string | null;
    unit_price: number;
    tax_rate: number;
    received_quantity: number;
    amount: number;
  }>;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<PODetail>(`/api/purchase-orders/${params.id}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load PO'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this purchase order?')) return;
    setDeleting(true);
    try { await api(`/api/purchase-orders/${params.id}`, { method: 'DELETE' }); toast.success('PO deleted'); router.push('/purchase-orders'); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete PO'); setDeleting(false); }
  }

  async function handleReceive() {
    const items = Object.entries(receiveItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, receivedQty: qty }));
    if (!items.length) { toast.error('Enter quantities to receive'); return; }
    try {
      await api(`/api/purchase-orders/${params.id}`, { method: 'PATCH', body: { receive: true, receivedItems: items } });
      toast.success('Items received');
      setReceiving(false);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to receive items'); }
  }

  async function handleStatusChange(status: string) {
    try {
      await api(`/api/purchase-orders/${params.id}`, { method: 'PATCH', body: { status } });
      toast.success(`Status updated to ${status}`);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update status'); }
  }

  if (loading) return <Loading label="Loading purchase order..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Purchase order not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.po_number}`} description="Update purchase order" />
        <PurchaseOrderForm mode="edit" id={data.id} initial={{
          supplierId: null, supplierName: data.supplier_name, supplierCompany: data.supplier_company, supplierAddress: data.supplier_address, supplierCountry: data.supplier_country, warehouseId: data.warehouse_id, currency: data.currency, orderDate: data.order_date, expectedDate: data.expected_date, discount: data.discount, taxRate: data.tax_rate, shippingCharges: data.shipping_charges, notes: data.notes, terms: data.terms, items: (data.items ?? []).map((i) => ({ description: i.description, hsnCode: i.hsn_code, quantity: i.quantity, unit: i.unit, unitPrice: i.unit_price, taxRate: i.tax_rate }))
        }} />
      </div>
    );
  }

  const canReceive = data.status === 'confirmed' || data.status === 'partially_received';

  return (
    <div className="space-y-6">
      <PageHeader title={data.po_number} description={`Supplier: ${data.supplier_name} · ${PURCHASE_ORDER_STATUSES.find((s) => s.value === data.status)?.label ?? data.status}`}>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        {canReceive && <Button variant="outline" onClick={() => setReceiving(true)}><Truck className="h-4 w-4" /> Receive</Button>}
        <Button variant="destructive" disabled={deleting} onClick={handleDelete}><Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}</Button>
      </PageHeader>

      {receiving && (
        <Card><CardHeader><CardTitle>Receive Items</CardTitle><CardDescription>Enter quantities received for each line item.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(data.items ?? []).filter((i) => (i.received_quantity ?? 0) < i.quantity).map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-line p-4">
              <div className="flex-1"><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">Ordered: {item.quantity} {item.unit} · Received: {item.received_quantity ?? 0}</p></div>
              <Input type="number" min={0} max={item.quantity - (item.received_quantity ?? 0)} step="any" value={receiveItems[item.id] ?? 0} onChange={(e) => setReceiveItems({ ...receiveItems, [item.id]: Number(e.target.value) })} className="w-32" />
            </div>
          ))}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setReceiveItems({}); setReceiving(false); }}>Cancel</Button><Button onClick={handleReceive}><CheckCircle className="h-4 w-4" /> Confirm Receipt</Button></div>
        </CardContent></Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Supplier</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
          <Info label="Name" value={data.supplier_name} /><Info label="Company" value={data.supplier_company ?? '—'} />
          {data.supplier_address && <Info label="Address" value={data.supplier_address} />}
          {data.supplier_country && <Info label="Country" value={data.supplier_country} />}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
          <Info label="Order date" value={formatDate(data.order_date)} /><Info label="Expected" value={data.expected_date ? formatDate(data.expected_date) : '—'} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
          <Info label="Subtotal" value={formatCurrency(data.subtotal, data.currency)} /><Info label="Discount" value={formatCurrency(data.discount, data.currency)} />
          <Info label="Tax" value={formatCurrency(data.tax, data.currency)} /><Info label="Shipping" value={formatCurrency(data.shipping_charges, data.currency)} />
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{formatCurrency(data.total, data.currency)}</p></div>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-4">Description</th><th className="py-2 pr-4">HS Code</th><th className="py-2 pr-4 text-right">Ordered</th><th className="py-2 pr-4 text-right">Received</th><th className="py-2 pr-4 text-right">Pending</th><th className="py-2 pr-4 text-right">Unit Price</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>
        {(data.items ?? []).map((item) => (<tr key={item.id} className="border-b border-line/50 last:border-0"><td className="py-2 pr-4">{item.description}</td><td className="py-2 pr-4">{item.hsn_code ?? '—'}</td><td className="py-2 pr-4 text-right tabular-nums">{item.quantity} {item.unit}</td><td className="py-2 pr-4 text-right tabular-nums">{item.received_quantity ?? 0}</td><td className="py-2 pr-4 text-right tabular-nums">{item.quantity - (item.received_quantity ?? 0)}</td><td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(item.unit_price, data.currency)}</td><td className="py-2 text-right tabular-nums">{formatCurrency(item.amount, data.currency)}</td></tr>))}
      </tbody></table></CardContent></Card>

      {data.terms && (
        <Card>
          <CardHeader><CardTitle className="text-base">Terms</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{data.terms}</p></CardContent>
        </Card>
      )}
      {data.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{data.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (<div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>);
}