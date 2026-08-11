'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, FileText, BadgeCheck, DollarSign, Package, Contact, Eye,
  MousePointerClick, Globe, TrendingUp, ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
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

function RankedList({ title, items, empty }: { title: string; items: Array<{ label: string; value: number }>; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="w-6 text-sm font-medium text-muted-foreground">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium tabular-nums text-foreground">{formatNumber(item.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ data: DashboardStats }>('/api/analytics/dashboard')
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-neg mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Could not load dashboard</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return <Loading className="min-h-[60vh]" label="Loading dashboard..." />;

  const hasActivity = stats.leadsTotal > 0 || stats.quotationTotal > 0 || stats.invoiceTotal > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your export business"
      >
        <Button variant="outline" asChild>
          <Link href="/leads/new">
            <Users className="h-4 w-4" />
            Add Lead
          </Link>
        </Button>
        <Button asChild>
          <Link href="/quotations/new">
            New Quotation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Leads"
          value={formatNumber(stats.leadsTotal)}
          icon={Users}
          description={`${formatNumber(stats.leadsNew)} new · ${formatNumber(stats.leadsWon)} won this month`}
          delta={{
            value: stats.leadsNew > 0 ? ((stats.leadsWon / stats.leadsNew) * 100) : 0,
            trend: stats.leadsWon > stats.leadsNew * 0.3 ? 'up' : 'neutral',
            label: 'win rate'
          }}
        />
        <KpiCard
          title="Quotations"
          value={formatNumber(stats.quotationTotal)}
          icon={FileText}
          description={`${formatNumber(stats.quotationAccepted)} accepted · ${formatCurrency(stats.quotationValue)} quoted`}
          delta={{
            value: stats.quotationTotal > 0 ? ((stats.quotationAccepted / stats.quotationTotal) * 100) : 0,
            trend: stats.quotationAccepted > 0 ? 'up' : 'neutral',
            label: 'acceptance rate'
          }}
        />
        <KpiCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          description={`${formatCurrency(stats.pendingRevenue)} pending`}
          delta={{
            value: stats.revenue > 0 ? ((stats.pendingRevenue / stats.revenue) * 100) : 0,
            trend: 'neutral',
            label: 'pending'
          }}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={BadgeCheck}
          description={`${formatNumber(stats.leadsThisMonth)} leads this month`}
          delta={{
            value: stats.conversionRate,
            trend: stats.conversionRate > 20 ? 'up' : 'neutral',
            label: 'vs last month'
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Invoices" 
          value={formatNumber(stats.invoiceTotal)} 
          icon={DollarSign} 
          description={`${formatNumber(stats.invoicePaid)} paid`}
          delta={{
            value: stats.invoiceTotal > 0 ? ((stats.invoicePaid / stats.invoiceTotal) * 100) : 0,
            trend: 'up',
            label: 'paid rate'
          }}
        />
        <KpiCard 
          title="Published Products" 
          value={formatNumber(stats.productsPublished)} 
          icon={Package}
          delta={{
            value: 5,
            trend: 'up',
            label: 'this month'
          }}
        />
        <KpiCard 
          title="Buyers" 
          value={formatNumber(stats.buyersTotal)} 
          icon={Contact}
          delta={{
            value: 3,
            trend: 'up',
            label: 'new this month'
          }}
        />
        <KpiCard 
          title="Website Visitors" 
          value={formatNumber(stats.visitorsThisMonth)} 
          icon={Eye} 
          description="Last 30 days"
          delta={{
            value: 12,
            trend: 'up',
            label: 'vs last period'
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankedList
          title="Top Countries"
          items={stats.topCountries.map((c) => ({ label: c.country, value: c.count }))}
          empty="No country data yet"
        />
        <RankedList
          title="Top Products"
          items={stats.topProducts.map((p) => ({ label: p.product, value: p.count }))}
          empty="No product interest data yet"
        />
      </div>

      {!hasActivity && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Get started with Export OS</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Add your first product, then generate quotations and track leads to see your business grow.
            </p>
            <Button asChild>
              <Link href="/products/new">
                <Package className="h-4 w-4 mr-2" />
                Add your first product
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
