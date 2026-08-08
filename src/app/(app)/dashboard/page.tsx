'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, FileText, BadgeCheck, DollarSign, Package, Contact, Eye,
  MousePointerClick, Globe, TrendingUp, ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
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

function RankedList({ title, items, empty }: { title: string; items: Array<{ label: string; value: number }>; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card>
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
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium">{formatNumber(item.value)}</span>
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
        <EmptyState
          title="Could not load dashboard"
          description={error}
          icon={TrendingUp}
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
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
        <StatCard
          title="Total Leads"
          value={formatNumber(stats.leadsTotal)}
          icon={Users}
          description={`${formatNumber(stats.leadsNew)} new · ${formatNumber(stats.leadsWon)} won this month`}
        />
        <StatCard
          title="Quotations"
          value={formatNumber(stats.quotationTotal)}
          icon={FileText}
          description={`${formatNumber(stats.quotationAccepted)} accepted · ${formatCurrency(stats.quotationValue)} quoted`}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          description={`${formatCurrency(stats.pendingRevenue)} pending`}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={BadgeCheck}
          description={`${formatNumber(stats.leadsThisMonth)} leads this month`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Invoices" value={formatNumber(stats.invoiceTotal)} icon={DollarSign} description={`${formatNumber(stats.invoicePaid)} paid`} />
        <StatCard title="Published Products" value={formatNumber(stats.productsPublished)} icon={Package} />
        <StatCard title="Buyers" value={formatNumber(stats.buyersTotal)} icon={Contact} />
        <StatCard title="Website Visitors" value={formatNumber(stats.visitorsThisMonth)} icon={Eye} description="Last 30 days" />
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
        <EmptyState
          title="Get started with Export OS"
          description="Add your first product, then generate quotations and track leads to see your business grow."
          icon={Globe}
          action={
            <Button asChild>
              <Link href="/products/new">
                <Package className="h-4 w-4" />
                Add your first product
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
