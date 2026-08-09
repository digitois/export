'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Warehouse, Package, AlertTriangle, TrendingUp, Plus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatNumber } from '@/lib/utils';
import { STOCK_MOVEMENT_TYPES, PURCHASE_ORDER_STATUSES } from '@/lib/constants';

interface StockLevelRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reorder_point: number;
  product?: { id: string; name: string; sku?: string | null };
  warehouse?: { id: string; name: string };
}

interface StockMovementRow {
  id: string;
  type: string;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
  occurred_at: string;
  product?: { name: string; sku?: string | null };
  warehouse?: { name: string };
}

interface WarehouseRow {
  id: string;
  name: string;
  location?: string | null;
  is_default: boolean;
}

export default function InventoryPage() {
  const [levels, setLevels] = useState<StockLevelRow[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api<{ data: StockLevelRow[] }>(`/api/stock/levels${getSearchParamString({ lowStockOnly: lowStockFilter ? 'true' : '', warehouseId: warehouseFilter })}`),
      api<{ data: StockMovementRow[] }>('/api/stock/movements?pageSize=50'),
      api<{ data: WarehouseRow[] }>('/api/warehouses')
    ])
      .then(([l, m, w]) => {
        if (cancelled) return;
        if (l.status === 'fulfilled') setLevels(l.value.data);
        if (m.status === 'fulfilled') setMovements(m.value.data);
        if (w.status === 'fulfilled') setWarehouses(w.value.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lowStockFilter, warehouseFilter]);

  const lowStockCount = levels.filter((l) => l.quantity <= l.reorder_point && l.reorder_point > 0).length;
  const totalValue = levels.reduce((sum, l) => sum + l.quantity, 0);
  const warehousesCount = warehouses.length;
  const recentMovements = movements.length;

  if (loading) return <Loading label="Loading inventory..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock levels, movements and purchase orders across warehouses">
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/warehouses/new"><Plus className="h-4 w-4" /> Warehouse</Link></Button>
          <Button asChild variant="outline"><Link href="/suppliers/new"><Plus className="h-4 w-4" /> Supplier</Link></Button>
          <Button asChild><Link href="/purchase-orders/new"><Plus className="h-4 w-4" /> Purchase Order</Link></Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total SKUs" value={formatNumber(levels.length)} icon={Package} description="Tracked products" />
        <StatCard title="Warehouses" value={formatNumber(warehousesCount)} icon={Warehouse} description="Active locations" />
        <StatCard title="Low Stock Alerts" value={formatNumber(lowStockCount)} icon={AlertTriangle} description={lowStockCount > 0 ? 'Needs reorder' : 'All stocked'} />
        <StatCard title="Recent Movements" value={formatNumber(recentMovements)} icon={TrendingUp} description="Last 50 entries" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>Current quantities per warehouse</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={lowStockFilter ? 'low' : 'all'} onValueChange={(v) => setLowStockFilter(v === 'low')}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All stock" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low stock only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All warehouses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All warehouses</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {levels.length === 0 ? (
              <EmptyState icon={Package} title="No stock data" description="Create a warehouse and add products to start tracking inventory." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Reorder Pt</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((level) => (
                      <TableRow key={level.id}>
                        <TableCell>
                          <Link href={`/products/${level.product_id}`} className="font-medium hover:underline">
                            {level.product?.name ?? 'Product'}
                          </Link>
                          {level.product?.sku && <p className="text-xs text-muted-foreground">SKU: {level.product.sku}</p>}
                        </TableCell>
                        <TableCell>{level.warehouse?.name ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(level.quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(level.reorder_point)}</TableCell>
                        <TableCell>
                          {level.reorder_point > 0 && level.quantity <= level.reorder_point ? (
                            <StatusBadge status="low" />
                          ) : (
                            <StatusBadge status="ok" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
            <CardDescription>Last 50 in/out/adjustment entries</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No movements yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{mov.product?.name ?? '—'}</TableCell>
                      <TableCell>{mov.warehouse?.name ?? '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={mov.type} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(mov.quantity)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mov.reference_type && mov.reference_id ? `${mov.reference_type}:${mov.reference_id.slice(0, 8)}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(mov.occurred_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <EmptyState icon={Warehouse} title="No warehouses" description="Create your first warehouse to start tracking inventory by location." action={<Button asChild><Link href="/warehouses/new"><Plus className="h-4 w-4" /> Add Warehouse</Link></Button>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell><Link href={`/warehouses/${wh.id}`} className="font-medium hover:underline">{wh.name}</Link></TableCell>
                    <TableCell>{wh.location ?? '—'}</TableCell>
                    <TableCell>{wh.is_default ? <StatusBadge status="yes" /> : <StatusBadge status="no" />}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/warehouses/${wh.id}`}>View</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href={`/warehouses/${wh.id}/edit`}>Edit</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}