'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_platform_admin?: boolean;
  created_at: string;
  organizations?: Array<{
    role?: string;
    organizations?: { name?: string } | null;
  }> | null;
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: UserRow[]; meta: { count: number; totalPages: number } }>(
        `/api/admin/users${getSearchParamString({ page, pageSize, q })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="All registered profiles across the platform." />

      <div className="flex flex-col gap-3 lg:flex-row">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="lg:max-w-sm"
        />
        <p className="ml-auto self-center text-sm text-muted-foreground">{count} user{count !== 1 && 's'}</p>
      </div>

      {loading ? (
        <Loading label="Loading users..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Adjust your search to find users."
          icon={Users}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Memberships</TableHead>
                  <TableHead>Platform Admin</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email ?? '-'}</TableCell>
                    <TableCell>
                      {(user.organizations?.length ?? 0) === 0 ? (
                        <span className="text-sm text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.organizations?.map((m, i) => (
                            <Badge key={i} variant="secondary">
                              {m.organizations?.name ?? 'Org'} · {m.role ?? 'member'}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_platform_admin ? <Badge variant="default">Yes</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
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
    </div>
  );
}