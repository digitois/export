'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Trash2, FileText, Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading, Spinner } from '@/components/loading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { INVOICE_STATUSES, INVOICE_TYPES } from '@/lib/constants';
import InvoiceForm from '@/components/invoices/invoice-form';

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_type: string;
  buyer_name: string;
  buyer_company?: string | null;
  buyer_email?: string | null;
  buyer_address?: string | null;
  buyer_country?: string | null;
  currency: string;
  payment_terms?: string | null;
  invoice_date: string;
  due_date?: string | null;
  discount: number;
  tax: number;
  tax_rate: number;
  shipping_charges: number;
  subtotal: number;
  total: number;
  amount_paid?: number | null;
  status: string;
  notes?: string | null;
  created_at: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit?: string | null;
    unit_price: number;
    amount: number;
  }[];
  payments?: {
    id: string;
    amount: number;
    currency: string;
    payment_date: string;
    method?: string | null;
    reference?: string | null;
  }[];
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payReference, setPayReference] = useState('');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id)).catch(() => null);
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api<{ data: InvoiceDetail }>(`/api/invoices/${id}`)
      .then((res) => {
        if (!cancelled) setInvoice(res.data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load invoice'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: string) {
    if (!invoice) return;
    try {
      await api(`/api/invoices/${invoice.id}/status`, { method: 'PATCH', body: { status } });
      setInvoice((prev) => prev ? { ...prev, status } : prev);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function recordPayment() {
    if (!invoice) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setRecording(true);
    try {
      await api(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body: {
          amount,
          currency: invoice.currency,
          paymentDate: payDate,
          method: payMethod,
          reference: payReference || null,
          notes: null
        }
      });
      toast.success('Payment recorded');
      setPayAmount('');
      setPayReference('');
      const res = await api<{ data: InvoiceDetail }>(`/api/invoices/${invoice.id}`);
      setInvoice(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setRecording(false);
    }
  }

  async function deleteInvoice() {
    if (!invoice) return;
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      toast.success('Invoice deleted');
      window.location.href = '/invoices';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invoice');
      setDeleting(false);
    }
  }

  if (!id) return <Loading />;
  if (loading) return <Loading label="Loading invoice..." />;
  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice not found" />
        <Button asChild variant="outline"><Link href="/invoices"><ArrowLeft className="h-4 w-4" /> Back to invoices</Link></Button>
      </div>
    );
  }

  const balance = invoice.total - (invoice.amount_paid ?? 0);
  const initial = {
    invoiceType: invoice.invoice_type,
    buyerName: invoice.buyer_name,
    buyerCompany: invoice.buyer_company,
    buyerEmail: invoice.buyer_email,
    buyerAddress: invoice.buyer_address,
    buyerCountry: invoice.buyer_country,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    paymentTerms: invoice.payment_terms,
    discount: invoice.discount,
    taxRate: invoice.tax_rate,
    shippingCharges: invoice.shipping_charges,
    notes: invoice.notes,
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unit_price
    }))
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description={`For ${invoice.buyer_name}${invoice.buyer_company ? ` · ${invoice.buyer_company}` : ''}`}
      >
        <StatusBadge status={invoice.status} />
        <Button asChild variant="outline"><Link href="/invoices"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Button asChild variant="outline">
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
            <FileDown className="h-4 w-4" /> PDF
          </a>
        </Button>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          <FileText className="h-4 w-4" /> {editing ? 'Cancel Edit' : 'Edit'}
        </Button>
        <Button variant="destructive" disabled={deleting} onClick={deleteInvoice}>
          {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {INVOICE_TYPES.find((t) => t.value === invoice.invoice_type)?.label ?? invoice.invoice_type} · {formatDate(invoice.invoice_date)}
            </p>
            <p className="text-sm text-muted-foreground">
              Due {invoice.due_date ? formatDate(invoice.due_date) : '-'} · {invoice.payment_terms ?? ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{formatCurrency(invoice.total, invoice.currency)}</div>
            {invoice.amount_paid != null && invoice.amount_paid > 0 && (
              <p className="text-sm text-muted-foreground">
                Paid {formatCurrency(invoice.amount_paid, invoice.currency)} · Balance {formatCurrency(balance, invoice.currency)}
              </p>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {INVOICE_STATUSES.map((s) => (
              <Button
                key={s.value}
                variant={invoice.status === s.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeStatus(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing ? (
        <InvoiceForm mode="edit" id={invoice.id} initial={initial} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount, invoice.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-6 py-4">
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(invoice.discount, invoice.currency)}</span></div>
                <div className="flex justify-between"><span>Tax ({invoice.tax_rate}%)</span><span>{formatCurrency(invoice.tax, invoice.currency)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(invoice.shipping_charges, invoice.currency)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span></div>
              </div>
            </div>
            {invoice.notes && (
              <div className="border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
          <CardDescription>Record incoming payments against this invoice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min={0} step="any" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-36" />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="letter_of_credit">Letter of Credit</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="payment_link">Payment Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Reference</Label>
              <Input value={payReference} placeholder="Bank / LC reference" onChange={(e) => setPayReference(e.target.value)} />
            </div>
            <Button onClick={recordPayment} disabled={recording}>
              {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Record
            </Button>
          </div>

          {invoice.payments && invoice.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="capitalize">{(p.method ?? 'other').replace(/_/g, ' ')}</TableCell>
                    <TableCell>{p.reference ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.amount, p.currency ?? invoice.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}