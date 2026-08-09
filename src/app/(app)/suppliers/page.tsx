'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Truck, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';

interface SupplierRow {
  id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  currency: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [items, setItems] = useState<SupplierRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: SupplierRow[]; meta: { count: number } }>(`/api/suppliers${getSearchParamString({ page, pageSize, q })}`)
      .then((res) => {
        if (!cancelled) { setItems(res.data); setCount(res.meta.count); }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load suppliers'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, pageSize, q]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this supplier?')) return;
    setDeleting(id);
    try {
      await api(`/api/suppliers/${id}`, { method: 'DELETE' });
      toast.success('Supplier deleted');
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete supplier');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) return <Loading label="Loading suppliers..." />;
  if (items.length === 0) return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage your vendor contacts">
        <Button asChild>
          <Link href="/suppliers/new"><Plus className="h-4 w-4" /> New Supplier</Link>
        </Button>
      </PageHeader>
      <EmptyState icon={Truck} title="No suppliers yet" description="Add suppliers to create purchase orders." action={<Button asChild><Link href="/suppliers/new"><Plus className="h-4 w-4" /> New Supplier</Link></Button>} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Vendor contacts for purchase orders">
        <Button asChild>
          <Link href="/suppliers/new"><Plus className="h-4 w-4" /> New Supplier</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search suppliers..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="md:max-w-xs"
            />
            <div className="ml-auto text-sm text-muted-foreground">{count} supplier{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/suppliers/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.contact_person ?? '—'}</TableCell>
                  <TableCell>{s.email ?? '—'}</TableCell>
                  <TableCell>{s.phone ?? '—'}</TableCell>
                  <TableCell>{s.country ?? '—'}</TableCell>
                  <TableCell>{s.currency}</TableCell>
                  <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
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
                            <Link href={`/suppliers/${s.id}`}><Pencil className="h-4 w-4" /> View</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive disabled={deleting === s.id} onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-4 w-4" /> {deleting === s.id ? 'Deleting...' : 'Delete'}
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