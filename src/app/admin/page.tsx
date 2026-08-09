'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, DollarSign, LifeBuoy, ArrowRight, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

interface OverviewData {
  organizations: number;
  users: number;
  mrr: number;
  activeSubscriptions: number;
  payments: number;
  openTickets: number;
  newSignupsThisMonth: number;
  recentOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    plans?: { name?: string; code?: string } | null;
  }>;
  recentTickets: Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
    profiles?: { full_name?: string | null; email?: string | null } | null;
    organizations?: { name?: string } | null;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ data: OverviewData }>('/api/admin/overview')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load overview');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Overview" />
        <EmptyState
          title="Could not load overview"
          description={error}
          icon={TrendingUp}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  if (!data) return <Loading className="min-h-[60vh]" label="Loading overview..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Platform-wide snapshot of every organization, user and transaction."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizations"
          value={formatNumber(data.organizations)}
          icon={Building2}
          description={`${formatNumber(data.newSignupsThisMonth)} new this month`}
        />
        <StatCard title="Users" value={formatNumber(data.users)} icon={Users} />
        <StatCard
          title="MRR"
          value={formatCurrency(data.mrr)}
          icon={DollarSign}
          description={`${formatNumber(data.activeSubscriptions)} active subscriptions`}
        />
        <StatCard
          title="Open Tickets"
          value={formatNumber(data.openTickets)}
          icon={LifeBuoy}
          description={`${formatNumber(data.payments)} total payments`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Organizations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/organizations">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentOrganizations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No organizations yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Link href={`/admin/organizations?q=${encodeURIComponent(org.name)}`} className="font-medium hover:underline">
                          {org.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">/{org.slug}</p>
                      </TableCell>
                      <TableCell>{org.plans?.name ?? org.plans?.code ?? '-'}</TableCell>
                      <TableCell><StatusBadge status={org.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(org.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Support Tickets</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/tickets">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentTickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tickets yet</p>
            ) : (
              <ul className="space-y-3">
                {data.recentTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link href={`/admin/tickets/${ticket.id}`} className="group flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:underline">{ticket.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ticket.organizations?.name ?? '-'} · {ticket.profiles?.full_name ?? ticket.profiles?.email ?? '-'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={ticket.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}