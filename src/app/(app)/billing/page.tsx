'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ShieldCheck, CreditCard, Check, FileText } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SaasInvoiceRow {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  total: number;
  amount_paid: number;
  status: string;
}

interface GatewayConfig {
  id: string | null;
  provider: string;
  enabled: boolean;
  is_default: boolean;
  test_mode: boolean;
  config: Record<string, string>;
}

const GATEWAY_META: Record<string, { name: string; fields: Array<{ key: string; label: string; type?: string; placeholder?: string }>; description: string }> = {
  razorpay: {
    name: 'Razorpay',
    description: 'Cards, UPI, net banking and wallets in India.',
    fields: [
      { key: 'keyId', label: 'Key ID', placeholder: 'rzp_test_...' },
      { key: 'keySecret', label: 'Key Secret', type: 'password', placeholder: '••••••••' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: '••••••••' }
    ]
  },
  stripe: {
    name: 'Stripe',
    description: 'International cards via Stripe Payment Intents.',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_test_...' },
      { key: 'keySecret', label: 'Secret Key', type: 'password', placeholder: 'sk_test_...' },
      { key: 'webhookSecret', label: 'Webhook Secret (whsec_...)', type: 'password', placeholder: 'whsec_...' }
    ]
  },
  phonepe: {
    name: 'PhonePe',
    description: 'UPI-first payments in India.',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', placeholder: 'PGMERCHANT' },
      { key: 'salt', label: 'Salt Key', type: 'password', placeholder: '••••••••' },
      { key: 'saltIndex', label: 'Salt Index', placeholder: '1' }
    ]
  },
  cashfree: {
    name: 'Cashfree',
    description: 'Cards, UPI and net banking with a payment page.',
    fields: [
      { key: 'keyId', label: 'Client ID', placeholder: 'cf_...' },
      { key: 'keySecret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: '••••••••' }
    ]
  },
  instamojo: {
    name: 'Instamojo',
    description: 'Payment requests shared via link.',
    fields: [
      { key: 'keyId', label: 'API Key', placeholder: '...' },
      { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: '••••••••' }
    ]
  }
};

export default function BillingPage() {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<SaasInvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: GatewayConfig[] }>('/api/billing/gateways')
      .then((res) => {
        if (cancelled) return;
        setGateways(res.data);
        const values: Record<string, Record<string, string>> = {};
        const toggles: Record<string, boolean> = {};
        const tests: Record<string, boolean> = {};
        for (const g of res.data) {
          values[g.provider] = { ...(g.config ?? {}) };
          toggles[g.provider] = g.enabled;
          tests[g.provider] = g.test_mode;
        }
        setFormValues(values);
        setToggleValues(toggles);
        setTestMode(tests);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load payment gateways'))
      .finally(() => { if (!cancelled) setLoading(false); });

    api<{ data: SaasInvoiceRow[] }>('/api/billing/invoices?page=1&pageSize=50')
      .then((res) => { if (!cancelled) setInvoices(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInvoicesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave(provider: string) {
    setSavingProvider(provider);
    try {
      await api('/api/billing/gateways', {
        method: 'POST',
        body: {
          provider,
          enabled: toggleValues[provider] ?? false,
          testMode: testMode[provider] ?? true,
          config: formValues[provider] ?? {}
        }
      });
      toast.success('Gateway settings saved');
      const [res] = await Promise.all([api<{ data: GatewayConfig[] }>('/api/billing/gateways')]);
      setGateways(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save gateway');
    } finally {
      setSavingProvider(null);
    }
  }

  async function handleSetDefault(provider: string) {
    try {
      await api(`/api/billing/gateways/${provider}`, { method: 'PATCH' });
      toast.success('Default gateway updated');
      const [res] = await Promise.all([api<{ data: GatewayConfig[] }>('/api/billing/gateways')]);
      setGateways(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default gateway');
    }
  }

  if (loading) return <Loading label="Loading billing settings..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Payments" description="Configure the payment gateways your organization accepts">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {gateways.some((g) => g.enabled) ? (
            <span className="font-medium">Active: <span className="text-pos">{GATEWAY_META[gateways.find((g) => g.enabled && g.is_default)?.provider ?? gateways.find((g) => g.enabled)?.provider ?? '']?.name ?? '—'}</span></span>
          ) : (
            <span className="text-muted-foreground">No gateway enabled</span>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {gateways.map((g) => {
          const meta = GATEWAY_META[g.provider] ?? { name: g.provider, description: '', fields: [] };
          const fields = meta.fields.filter((f) => g.provider !== 'phonepe' || f.key === 'merchantId' || f.key === 'salt' || f.key === 'saltIndex');
          return (
            <Card key={g.provider} className={g.is_default ? 'ring-1 ring-pos' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      {meta.name}
                      {g.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pos/10 px-2 py-0.5 text-xs font-medium text-pos">
                          <Check className="h-3 w-3" /> Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{meta.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={toggleValues[g.provider] ?? false} onCheckedChange={(v) => setToggleValues((prev) => ({ ...prev, [g.provider]: v }))} id={`enabled-${g.provider}`} />
                      <Label htmlFor={`enabled-${g.provider}`} className="text-sm">{toggleValues[g.provider] ? 'Enabled' : 'Disabled'}</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={testMode[g.provider] ?? true} onCheckedChange={(v) => setTestMode((prev) => ({ ...prev, [g.provider]: v }))} id={`test-${g.provider}`} />
                  <Label htmlFor={`test-${g.provider}`} className="text-sm">Test mode</Label>
                </div>

                {fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <Input
                      type={f.type ?? 'text'}
                      value={formValues[g.provider]?.[f.key] ?? ''}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [g.provider]: { ...(prev[g.provider] ?? {}), [f.key]: e.target.value } }))}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <Button variant="outline" size="sm" disabled={!toggleValues[g.provider] || g.is_default} onClick={() => handleSetDefault(g.provider)}>
                    {g.is_default ? 'Default gateway' : 'Set as default'}
                  </Button>
                  <Button size="sm" disabled={savingProvider === g.provider} onClick={() => handleSave(g.provider)}>
                    {savingProvider === g.provider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Your Invoices
          </CardTitle>
          <CardDescription>Billing invoices issued to your organization.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesLoading ? (
            <div className="p-8"><Loading label="Loading invoices..." /></div>
          ) : invoices.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={FileText} title="No invoices yet" description="Invoices issued by the platform will appear here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{inv.billing_period_start} → {inv.billing_period_end}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell className="text-sm">{inv.due_date ? formatDate(inv.due_date) : '—'}</TableCell>
                    <TableCell>{formatCurrency(inv.total, inv.currency)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(inv.amount_paid, inv.currency)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
