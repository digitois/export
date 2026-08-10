'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ReceiptText, Plus, Trash2, Loader2, Send, Check, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SaasInvoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  status: string;
  notes?: string | null;
  organizations?: { name?: string } | null;
}

interface OrgOption { id: string; name: string; }

const EMPTY_LINE = { description: '', quantity: '1', unitPrice: '' };

export default function AdminInvoicesPage() {
  const [items, setItems] = useState<SaasInvoice[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgId, setOrgId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ description: string; quantity: string; unitPrice: string }>>([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<SaasInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: SaasInvoice[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/saas-invoices${getSearchParamString({ page, pageSize })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCreate() {
    setDialogOpen(true);
    setOrgId('');
    setPeriodStart('');
    setPeriodEnd('');
    setDueDate('');
    setTax('0');
    setNotes('');
    setLines([{ ...EMPTY_LINE }]);
    try {
      const res = await api<{ data: OrgOption[] }>('/api/admin/organizations?page=1&pageSize=100');
      setOrgs(res.data ?? []);
    } catch {
      setOrgs([]);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodStart || !periodEnd) {
      toast.error('Select an organization and billing period');
      return;
    }
    const parsedLines = lines
      .map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }))
      .filter((l) => l.description);
    if (parsedLines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      await api('/api/admin/saas-invoices', {
        method: 'POST',
        body: {
          organizationId: orgId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          issueDate,
          dueDate: dueDate || null,
          currency,
          tax: Number(tax) || 0,
          notes: notes || null,
          items: parsedLines
        }
      });
      toast.success('Invoice created');
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(inv: SaasInvoice, status: string) {
    try {
      await api(`/api/admin/saas-invoices/${inv.id}`, { method: 'PATCH', body: { status } });
      toast.success('Invoice updated');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update invoice');
    }
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!paymentDialog || !payAmount) return;
    setSavingPayment(true);
    try {
      await api(`/api/admin/saas-invoices/${paymentDialog.id}`, {
        method: 'PATCH',
        body: { payment: { amount: Number(payAmount) } }
      });
      toast.success('Payment recorded');
      setPaymentDialog(null);
      setPayAmount('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDelete(inv: SaasInvoice) {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    try {
      await api(`/api/admin/saas-invoices/${inv.id}`, { method: 'DELETE' });
      toast.success('Invoice deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invoice');
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Billing invoices issued to organizations">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Invoice</Button>
      </PageHeader>
      <p className="text-sm text-muted-foreground">{count} invoice{count !== 1 && 's'}</p>

      {loading ? (
        <Loading label="Loading invoices..." />
      ) : items.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No invoices yet" description="Create a billing invoice for an organization." action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Invoice</Button>} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.organizations?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{inv.billing_period_start} → {inv.billing_period_end}</TableCell>
                    <TableCell>{formatCurrency(inv.total, inv.currency)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(inv.amount_paid, inv.currency)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatus(inv, 'sent')}><Send className="h-3.5 w-3.5" /> Send</Button>
                        )}
                        {inv.status !== 'paid' && inv.status !== 'void' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setPaymentDialog(inv); setPayAmount(String(inv.total - inv.amount_paid)); }}><Banknote className="h-3.5 w-3.5" /> Record Payment</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatus(inv, 'paid')}><Check className="h-3.5 w-3.5" /> Mark Paid</Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(inv)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New billing invoice</DialogTitle>
            <DialogDescription>Issue an invoice to an organization for a billing period.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Organization *</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Period start *</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Period end *</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tax</Label>
                <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Line items</Label>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_90px_36px] gap-2">
                  <Input placeholder="Description (e.g. Professional plan)" value={line.description} onChange={(e) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, description: e.target.value } : l)))} />
                  <Input type="number" min="0" placeholder="Qty" value={line.quantity} onChange={(e) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, quantity: e.target.value } : l)))} />
                  <Input type="number" min="0" step="0.01" placeholder="Price" value={line.unitPrice} onChange={(e) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, unitPrice: e.target.value } : l)))} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}><Plus className="h-4 w-4" /> Add item</Button>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialog !== null} onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paymentDialog?.invoice_number} — {paymentDialog ? formatCurrency(paymentDialog.total - paymentDialog.amount_paid, paymentDialog.currency) : ''} outstanding
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={savingPayment}>
                {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
