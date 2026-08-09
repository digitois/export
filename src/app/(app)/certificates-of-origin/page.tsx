'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Award, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { COO_TYPES } from '@/lib/constants';

interface CertificateRow {
  id: string;
  coo_number: string;
  certificate_type: string;
  buyer_name: string;
  buyer_company?: string | null;
  country_of_origin: string;
  country_of_destination?: string | null;
  issued_date: string;
  status: string;
}

export default function CertificatesIndexPage() {
  const [items, setItems] = useState<CertificateRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: CertificateRow[]; meta: { count: number; totalPages: number } }>(
      `/api/certificates-of-origin${getSearchParamString({ page, pageSize, q, type })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load certificates'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, type]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this certificate?')) return;
    setDeleting(id);
    try {
      await api(`/api/certificates-of-origin/${id}`, { method: 'DELETE' });
      toast.success('Certificate deleted');
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete certificate');
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Certificates of Origin" description="Non-preferential and preferential origin certificates">
        <Button asChild>
          <Link href="/certificates-of-origin/new">
            <Plus className="h-4 w-4" />
            New Certificate
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search certificate number..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-xs"
            />
            <Select value={type} onValueChange={(v) => { setType(v === 'all-types' ? '' : v); setPage(1); }}>
              <SelectTrigger className="md:w-56"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                {COO_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} certificate{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading certificates..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="Create certificates of origin for your export orders."
          icon={Award}
          action={
            <Button asChild>
              <Link href="/certificates-of-origin/new">
                <Plus className="h-4 w-4" />
                New Certificate
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
                  <TableHead>Type</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Origin → Destination</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Link href={`/certificates-of-origin/${cert.id}`} className="font-medium hover:underline">
                        {cert.coo_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {COO_TYPES.find((t) => t.value === cert.certificate_type)?.label ?? cert.certificate_type}
                    </TableCell>
                    <TableCell>
                      {cert.buyer_name}
                      {cert.buyer_company && <p className="text-xs text-muted-foreground">{cert.buyer_company}</p>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cert.country_of_origin} → {cert.country_of_destination ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(cert.issued_date)}</TableCell>
                    <TableCell><StatusBadge status={cert.status} /></TableCell>
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
                              <Link href={`/certificates-of-origin/${cert.id}`}><Pencil className="h-4 w-4" /> Open / Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === cert.id} onClick={() => handleDelete(cert.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === cert.id ? 'Deleting...' : 'Delete'}
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
