'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Package, MoreHorizontal } from 'lucide-react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { PRODUCT_STATUSES } from '@/lib/constants';

interface ProductMedia {
  id: string;
  type: string;
  url: string;
  alt_text?: string | null;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  hsn_code?: string | null;
  price?: number | null;
  currency: string;
  unit?: string | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  created_at: string;
  category?: ProductCategory | null;
  category_id?: string | null;
  media?: ProductMedia[];
  created_by?: { full_name?: string; email?: string } | null;
}

const STATUS_OPTIONS = PRODUCT_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

export default function ProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: Product[]; meta: { count: number; totalPages: number } }>(
      `/api/products${getSearchParamString({ page, pageSize, q, status })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, status]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api(`/api/products/${id}`, { method: 'DELETE' });
      toast.success('Product deleted');
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Your export product catalog">
        <Button variant="outline" asChild>
          <Link href="/products/categories">
            <Package className="h-4 w-4" />
            Categories
          </Link>
        </Button>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search products..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="md:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} product{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading products..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start building your export catalog."
          icon={Package}
          action={
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                Add Product
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
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.media?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.media[0].url} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                            {getInitials(product.name)}
                          </div>
                        )}
                        <div>
                          <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{product.sku || product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name ?? '-'}</TableCell>
                    <TableCell className="text-right">{product.price != null ? formatCurrency(product.price, product.currency ?? 'USD') : '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{product.hsn_code ?? '-'}</TableCell>
                    <TableCell><StatusBadge status={product.status} /></TableCell>
                    <TableCell className="text-sm">{formatDate(product.created_at)}</TableCell>
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
                              <Link href={`/products/${product.id}`}>
                                <Pencil className="h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive disabled={deleting === product.id} onClick={() => handleDelete(product.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === product.id ? 'Deleting...' : 'Delete'}
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
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}