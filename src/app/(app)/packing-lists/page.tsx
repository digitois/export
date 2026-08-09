'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, PackageCheck, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';

interface PackingListRow {
  id: string;
  packing_list_number: string;
  buyer_name: string;
  buyer_company?: string | null;
  total_packages: number;
  total_weight_kg: number;
  total_volume_cbm: number;
  status: string;
  created_at: string;
}

export default function PackingListsIndexPage() {
  const [items, setItems] = useState<PackingListRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: PackingListRow[]; meta: { count: number; totalPages: number } }>(
      `/api/packing-lists${getSearchParamString({ page, pageSize, q })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load packing lists'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this packing list?')) return;
    setDeleting(id);
    try {
      await api(`/api/packing-lists/${id}`, { method: 'DELETE' });
      toast.success('Packing list deleted');
      setItems((prev) => prev.filter((pl) => pl.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete packing list');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Packing Lists" description="Package-level detail for your shipments">
        <Button asChild>
          <Link href="/packing-lists/new">
            <Plus className="h-4 w-4" />
            New Packing List
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search packing list number..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-xs"
            />
            <div className="ml-auto text-sm text-muted-foreground">{count} packing list{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading packing lists..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No packing lists yet"
          description="Create a packing list to document packages, weights and volumes per shipment."
          icon={PackageCheck}
          action={
            <Button asChild>
              <Link href="/packing-lists/new">
                <Plus className="h-4 w-4" />
                New Packing List
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Packages</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Volume (cbm)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell>
                      <Link href={`/packing-lists/${pl.id}`} className="font-medium hover:underline">
                        {pl.packing_list_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {pl.buyer_name}
                      {pl.buyer_company && <p className="text-xs text-muted-foreground">{pl.buyer_company}</p>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pl.total_packages}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(pl.total_weight_kg).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(pl.total_volume_cbm).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={pl.status} /></TableCell>
                    <TableCell className="text-sm">{formatDate(pl.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/packing-lists/${pl.id}`}><Pencil className="h-4 w-4" /> Open / Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === pl.id} onClick={() => handleDelete(pl.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === pl.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
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
    </div>
  );
}
