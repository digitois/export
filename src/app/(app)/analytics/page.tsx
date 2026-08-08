'use client';

import { useEffect, useState } from 'react';
import {
  Users, UserPlus, Percent, DollarSign, Clock, Globe, BarChart3,
  Smartphone, Tablet, Monitor
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface DashboardStats {
  leadsTotal: number;
  leadsNew: number;
  leadsWon: number;
  leadsThisMonth: number;
  quotationTotal: number;
  quotationAccepted: number;
  quotationValue: number;
  invoiceTotal: number;
  invoicePaid: number;
  revenue: number;
  pendingRevenue: number;
  productsPublished: number;
  buyersTotal: number;
  visitorsThisMonth: number;
  conversionRate: number;
  topCountries: Array<{ country: string; count: number }>;
  topProducts: Array<{ product: string; count: number }>;
}

interface BarPoint {
  label: string;
  value: number;
}

interface FunnelStage {
  stage: string;
  count: number;
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quotation_sent: 'Quotation Sent',
  negotiation: 'Negotiation',
  won: 'Won'
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [trendLeads, setTrendLeads] = useState<BarPoint[]>([]);
  const [trendInvoices, setTrendInvoices] = useState<BarPoint[]>([]);
  const [visitorDays, setVisitorDays] = useState<BarPoint[]>([]);
  const [devices, setDevices] = useState<Record<string, number>>({ desktop: 0, mobile: 0, tablet: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api<{ data: DashboardStats }>('/api/analytics/dashboard'),
      api<{ data: { funnel: FunnelStage[] } }>('/api/analytics?type=funnel'),
      api<{ data: { leads: Array<{ month: string; value: number }>; invoices: Array<{ month: string; value: number }> } }>(
        '/api/analytics?type=trends&months=6'
      ),
      api<{ data: { byDay: Array<{ date: string; count: number }>; devices: Record<string, number> } }>(
        '/api/analytics?type=visitors&months=2'
      )
    ])
      .then(([s, f, t, v]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setStats(s.value.data);
        if (f.status === 'fulfilled') setFunnel(f.value.data.funnel);
        if (t.status === 'fulfilled') {
          setTrendLeads(t.value.data.leads.map((p) => ({ label: p.month, value: p.value })));
          setTrendInvoices(t.value.data.invoices.map((p) => ({ label: p.month, value: p.value })));
        }
        if (v.status === 'fulfilled') {
          setDevices(v.value.data.devices);
          const days = v.value.data.byDay.map((d) => ({ label: d.date, value: d.count }));
          setVisitorDays(days.slice(-14));
        }
        const rejected = [s, f, t, v].filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (rejected.length === 4) {
          setError(rejected[0].reason instanceof Error ? rejected[0].reason.message : 'Failed to load analytics');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = Boolean(stats || funnel.length || trendLeads.length || visitorDays.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance across leads, sales and website traffic." />

      {loading ? (
        <Loading label="Loading analytics..." />
      ) : error && !hasData ? (
        <EmptyState icon={BarChart3} title="Could not load analytics" description={error} />
      ) : (
        <>
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard title="Total Leads" value={formatNumber(stats.leadsTotal)} icon={Users} description="All time" />
              <StatCard title="New This Month" value={formatNumber(stats.leadsThisMonth)} icon={UserPlus} description="Leads created in last 30 days" />
              <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} description={`${stats.leadsWon} won of ${stats.leadsTotal}`} />
              <StatCard title="Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} description="Paid invoices" />
              <StatCard title="Pending Revenue" value={formatCurrency(stats.pendingRevenue)} icon={Clock} description="Sent invoices awaiting payment" />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead Funnel</CardTitle>
                <CardDescription>Open leads by current stage</CardDescription>
              </CardHeader>
              <CardContent>
                {funnel.length ? (
                  <div className="space-y-4">
                    {funnel.map((f) => (
                      <FunnelRow key={f.stage} stage={f.stage} count={f.count} max={Math.max(1, ...funnel.map((x) => x.count))} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Users} title="No funnel data" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Visitors</CardTitle>
                <CardDescription>Daily visits, last 14 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {visitorDays.length ? (
                  <BarChart data={visitorDays} valueFormat={(v) => formatNumber(v)} />
                ) : (
                  <EmptyState icon={BarChart3} title="No visitor data" />
                )}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Devices</p>
                  {(['desktop', 'mobile', 'tablet'] as const).map((device) => {
                    const count = devices[device] ?? 0;
                    const total = Math.max(1, (devices.desktop ?? 0) + (devices.mobile ?? 0) + (devices.tablet ?? 0));
                    return (
                      <DeviceRow key={device} device={device} count={count} percent={(count / total) * 100} />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Month</CardTitle>
                <CardDescription>New leads, last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {trendLeads.length ? (
                  <BarChart data={trendLeads} valueFormat={(v) => formatNumber(v)} />
                ) : (
                  <EmptyState icon={Users} title="No lead history" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Value by Month</CardTitle>
                <CardDescription>Billed amounts, last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {trendInvoices.length ? (
                  <BarChart data={trendInvoices} valueFormat={(v) => formatCurrency(v)} />
                ) : (
                  <EmptyState icon={BarChart3} title="No invoice history" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Where your leads come from</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topCountries.length ? (
                  <Leaderboard items={stats.topCountries.map((c) => ({ label: c.country, count: c.count }))} />
                ) : (
                  <EmptyState icon={Globe} title="No country data" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Products buyers are most interested in</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topProducts.length ? (
                  <Leaderboard items={stats.topProducts.map((p) => ({ label: p.product, count: p.count }))} />
                ) : (
                  <EmptyState icon={BarChart3} title="No product data" />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelRow({ stage, count, max }: { stage: string; count: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize text-muted-foreground">{STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ')}</span>
        <span className="font-medium tabular-nums">{formatNumber(count)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </div>
  );
}

function DeviceRow({ device, count, percent }: { device: 'desktop' | 'mobile' | 'tablet'; count: number; percent: number }) {
  const Icon = device === 'desktop' ? Monitor : device === 'mobile' ? Smartphone : Tablet;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 capitalize text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {device}
        </span>
        <span className="font-medium tabular-nums">{formatNumber(count)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Leaderboard({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">{i.label}</span>
            <span className="tabular-nums text-muted-foreground">{formatNumber(i.count)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, valueFormat }: { data: Array<{ label: string; value: number }>; valueFormat: (value: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 w-full items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="max-w-full truncate text-[10px] tabular-nums text-muted-foreground">{valueFormat(d.value)}</span>
          <div className="flex h-24 w-full items-end justify-center">
            <div className="w-full max-w-7 rounded-t bg-primary" style={{ height: `${(d.value / max) * 100}%` }} title={d.label} />
          </div>
          <span className="max-w-full truncate text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}