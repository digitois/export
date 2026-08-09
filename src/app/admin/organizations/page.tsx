'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Eye, Loader2, MoreHorizontal, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

const ORG_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' }
];

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plans?: { name?: string; code?: string } | null;
  subscriptions?: Array<{ status?: string }> | null;
}

interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  default_currency?: string;
  created_at: string;
  plans?: { name?: string; code?: string; price_monthly?: number; currency?: string } | null;
  subscriptions?: Array<{ id: string; status?: string; billing_cycle?: string; plan_id?: string | null }> | null;
  organization_members?: Array<{
    id: string;
    role?: string;
    status?: string;
    profiles?: { full_name?: string; email?: string } | null;
  }> | null;
}

export default function AdminOrganizationsPage() {
  const [items, setItems] = useState<OrganizationRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: OrganizationRow[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/organizations${getSearchParamString({ page, pageSize, q, status })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  async function openDetail(org: OrganizationRow) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await api<{ data: OrganizationDetail }>(`/api/admin/organizations/${org.id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load organization');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(org: OrganizationRow, next: string) {
    if (next === org.status) return;
    setChangingStatus(org.id);
    try {
      await api(`/api/admin/organizations/${org.id}`, { method: 'PATCH', body: { status: next } });
      toast.success(`Status updated to ${next}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setChangingStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Manage every tenant on the platform." />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              placeholder="Search by name or slug..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="lg:max-w-sm"
            />
            <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="lg:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORG_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="ml-auto self-center text-sm text-muted-foreground">{count} organization{count !== 1 && 's'}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading organizations..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description="Adjust your filters or wait for new signups."
          icon={Building2}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">/{org.slug}</p>
                    </TableCell>
                    <TableCell>{org.plans?.name ?? org.plans?.code ?? '-'}</TableCell>
                    <TableCell><StatusBadge status={org.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(org.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(org)}>
                              <Eye className="h-4 w-4" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={changingStatus === org.id}>
                              {changingStatus === org.id && <Loader2 className="h-4 w-4 animate-spin" />}
                              Change status
                            </DropdownMenuItem>
                            {ORG_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s.value}
                                disabled={s.value === org.status || changingStatus === org.id}
                                onClick={() => changeStatus(org, s.value)}
                              >
                                <Check className="h-4 w-4" />
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Organization details</DialogTitle>
            <DialogDescription>{detail?.name ?? 'Loading...'}</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Loading label="Loading details..." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="text-sm font-medium">/{detail.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm font-medium">{detail.plans?.name ?? detail.plans?.code ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm font-medium">{detail.default_currency ?? '-'}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Members</p>
                {(detail.organization_members?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No members</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.organization_members?.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.profiles?.full_name ?? m.profiles?.email ?? '-'}</TableCell>
                          <TableCell className="capitalize">{m.role ?? '-'}</TableCell>
                          <TableCell className="capitalize">{m.status ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Subscriptions</p>
                {(detail.subscriptions?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No subscriptions</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.subscriptions?.map((sub) => (
                      <li key={sub.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="capitalize">{sub.billing_cycle ?? 'monthly'}</span>
                        <StatusBadge status={sub.status ?? 'unknown'} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}