'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Send, Trash2, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/loading';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTATION_STATUSES } from '@/lib/constants';
import QuotationForm from '@/components/quotations/quotation-form';

interface QuotationDetail {
  id: string;
  quotation_number: string;
  buyer_name: string;
  buyer_company?: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  buyer_address?: string | null;
  buyer_country?: string | null;
  currency: string;
  incoterm: string;
  payment_terms?: string | null;
  validity_days: number;
  discount: number;
  freight: number;
  insurance: number;
  tax: number;
  tax_rate: number;
  subtotal: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at?: string | null;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit?: string | null;
    unit_price: number;
    amount: number;
  }[];
}

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id)).catch(() => null);
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api<{ data: QuotationDetail }>(`/api/quotations/${id}`)
      .then((res) => {
        if (!cancelled) setQuote(res.data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load quotation'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function sendQuotation() {
    if (!quote) return;
    setSending(true);
    try {
      const res = await api<{ data: { sent: boolean; error?: string | null } }>(`/api/quotations/${quote.id}/send`, { method: 'POST' });
      if (!res.data.sent) {
        toast.warning(res.data.error ? `Email not sent: ${res.data.error}` : 'Email not sent (SES not configured)');
      } else {
        toast.success(`Quotation emailed to ${quote.buyer_email ?? 'buyer'}`);
      }
      setQuote((prev) => prev ? { ...prev, status: 'sent' } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send quotation');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: string) {
    if (!quote) return;
    try {
      await api(`/api/quotations/${quote.id}/status`, { method: 'PATCH', body: { status } });
      setQuote((prev) => prev ? { ...prev, status: status as QuotationDetail['status'] } : prev);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function deleteQuotation() {
    if (!quote) return;
    if (!window.confirm('Delete this quotation? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/api/quotations/${quote.id}`, { method: 'DELETE' });
      toast.success('Quotation deleted');
      window.location.href = '/quotations';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quotation');
      setDeleting(false);
    }
  }

  if (!id) return <Loading />;
  if (loading) return <Loading label="Loading quotation..." />;
  if (!quote) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quotation not found" />
        <Button asChild variant="outline"><Link href="/quotations"><ArrowLeft className="h-4 w-4" /> Back to quotations</Link></Button>
      </div>
    );
  }

  const initial = {
    buyerName: quote.buyer_name,
    buyerCompany: quote.buyer_company,
    buyerEmail: quote.buyer_email,
    buyerPhone: quote.buyer_phone,
    buyerAddress: quote.buyer_address,
    buyerCountry: quote.buyer_country,
    currency: quote.currency,
    incoterm: quote.incoterm,
    paymentTerms: quote.payment_terms,
    validityDays: quote.validity_days,
    discount: quote.discount,
    freight: quote.freight,
    insurance: quote.insurance,
    taxRate: quote.tax_rate,
    notes: quote.notes,
    terms: quote.terms,
    items: quote.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unit_price
    }))
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.quotation_number}
        description={`For ${quote.buyer_name}${quote.buyer_company ? ` · ${quote.buyer_company}` : ''}`}
      >
        <Button asChild variant="outline"><Link href="/quotations"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Button asChild variant="outline">
          <a href={`/api/quotations/${quote.id}/pdf`} target="_blank" rel="noreferrer">
            <FileDown className="h-4 w-4" /> PDF
          </a>
        </Button>
        {quote.status === 'draft' && (
          <Button onClick={sendQuotation} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
          </Button>
        )}
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          <FileText className="h-4 w-4" /> {editing ? 'Cancel Edit' : 'Edit'}
        </Button>
        <Button variant="destructive" disabled={deleting} onClick={deleteQuotation}>
          {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={quote.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(quote.created_at)} · Valid until {quote.expires_at ? formatDate(quote.expires_at) : '-'}
            </span>
          </div>
          <span className="text-2xl font-semibold">{formatCurrency(quote.total, quote.currency)}</span>
        </CardHeader>
      </Card>

      {quote.status !== 'accepted' && quote.status !== 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {QUOTATION_STATUSES.filter((s) => s.value !== 'draft').map((s) => (
                <Button
                  key={s.value}
                  variant={quote.status === s.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeStatus(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {editing ? (
        <QuotationForm mode="edit" id={quote.id} initial={initial} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buyer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{quote.buyer_name}</p>
              {quote.buyer_company && <p>{quote.buyer_company}</p>}
              {quote.buyer_email && <p>{quote.buyer_email}</p>}
              {quote.buyer_phone && <p>{quote.buyer_phone}</p>}
              {quote.buyer_address && <p>{quote.buyer_address}</p>}
              {quote.buyer_country && <p>{quote.buyer_country}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Incoterm: <span className="font-medium">{quote.incoterm}</span></p>
              <p>Tax Rate: <span className="font-medium">{quote.tax_rate}%</span></p>
              <p>Validity: <span className="font-medium">{quote.validity_days} days</span></p>
              {quote.payment_terms && <p>Payment: <span className="font-medium">{quote.payment_terms}</span></p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(quote.subtotal, quote.currency)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(quote.discount, quote.currency)}</span></div>
              <div className="flex justify-between"><span>Tax ({quote.tax_rate}%)</span><span>{formatCurrency(quote.tax, quote.currency)}</span></div>
              <div className="flex justify-between"><span>Freight</span><span>{formatCurrency(quote.freight, quote.currency)}</span></div>
              <div className="flex justify-between"><span>Insurance</span><span>{formatCurrency(quote.insurance, quote.currency)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatCurrency(quote.total, quote.currency)}</span></div>
            </CardContent>
          </Card>

          {(quote.notes || quote.terms) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {quote.notes && <p>{quote.notes}</p>}
                {quote.terms && <p className="whitespace-pre-line text-muted-foreground">{quote.terms}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}