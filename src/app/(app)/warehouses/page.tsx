'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Warehouse, MapPin, MoreHorizontal, Trash2 } from 'lucide-react';
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

interface WarehouseRow {
  id: string;
  name: string;
  location?: string | null;
  is_default: boolean;
  created_at: string;
}

export default function WarehousesPage() {
  const [items, setItems] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: WarehouseRow[] }>('/api/warehouses')
      .then((res) => { if (!cancelled) setItems(res.data); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load warehouses'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this warehouse?')) return;
    setDeleting(id);
    try {
      await api(`/api/warehouses/${id}`, { method: 'DELETE' });
      toast.success('Warehouse deleted');
      setItems((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete warehouse');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <Loading label="Loading warehouses..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description="Manage storage locations for your inventory">
        <Button asChild><Link href="/warehouses/new"><Plus className="h-4 w-4" /> New Warehouse</Link></Button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Warehouse} title="No warehouses yet" description="Create a warehouse to start tracking inventory by location." action={<Button asChild><Link href="/warehouses/new"><Plus className="h-4 w-4" /> New Warehouse</Link></Button>} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell><Link href={`/warehouses/${wh.id}`} className="font-medium hover:underline">{wh.name}</Link></TableCell>
                    <TableCell>{wh.location ?? '—'}</TableCell>
                    <TableCell>{wh.is_default ? <StatusBadge status="yes" /> : <StatusBadge status="no" />}</TableCell>
                    <TableCell className="text-sm">{new Date(wh.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/warehouses/${wh.id}`}>View</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/warehouses/${wh.id}/edit`}>Edit</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === wh.id} onClick={() => handleDelete(wh.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === wh.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
}