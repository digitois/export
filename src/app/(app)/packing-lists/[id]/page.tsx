'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import PackingListForm from '@/components/packing-lists/packing-list-form';

interface PackingListDetail {
  id: string;
  packing_list_number: string;
  buyer_name: string;
  buyer_company?: string | null;
  buyer_address?: string | null;
  buyer_country?: string | null;
  container_no?: string | null;
  bl_awb_no?: string | null;
  port_of_loading?: string | null;
  port_of_discharge?: string | null;
  vessel?: string | null;
  total_packages: number;
  total_weight_kg: number;
  total_volume_cbm: number;
  currency: string;
  status: string;
  notes?: string | null;
  created_at: string;
  items?: Array<{
    id: string;
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit?: string | null;
    package_count: number;
    weight_kg: number;
    volume_cbm: number;
  }>;
}

export default function PackingListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PackingListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<PackingListDetail>(`/api/packing-lists/${params.id}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load packing list'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this packing list?')) return;
    setDeleting(true);
    try {
      await api(`/api/packing-lists/${params.id}`, { method: 'DELETE' });
      toast.success('Packing list deleted');
      router.push('/packing-lists');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete packing list');
      setDeleting(false);
    }
  }

  if (loading) return <Loading label="Loading packing list..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Packing list not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.packing_list_number}`} description="Update package details" />
        <PackingListForm
          mode="edit"
          id={data.id}
          initial={{
            buyerName: data.buyer_name,
            buyerCompany: data.buyer_company ?? null,
            buyerAddress: data.buyer_address ?? null,
            buyerCountry: data.buyer_country ?? null,
            containerNo: data.container_no ?? null,
            blAwbNo: data.bl_awb_no ?? null,
            portOfLoading: data.port_of_loading ?? null,
            portOfDischarge: data.port_of_discharge ?? null,
            vessel: data.vessel ?? null,
            currency: data.currency,
            notes: data.notes ?? null,
            items: (data.items ?? []).map((i) => ({
              description: i.description,
              hsnCode: i.hsn_code ?? null,
              quantity: i.quantity,
              unit: i.unit ?? null,
              packageCount: i.package_count,
              weightKg: i.weight_kg,
              volumeCbm: i.volume_cbm
            }))
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.packing_list_number}
        description={`Created ${formatDate(data.created_at)}`}
      >
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consignment</CardTitle>
            <CardDescription>Shipping route and packaging summary.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Buyer" value={[data.buyer_name, data.buyer_company, data.buyer_country].filter(Boolean).join(' · ')} />
            {data.container_no && <Info label="Container" value={data.container_no} />}
            {data.bl_awb_no && <Info label="B/L or AWB" value={data.bl_awb_no} />}
            {data.port_of_loading || data.port_of_discharge ? (
              <Info label="Route" value={`${data.port_of_loading ?? '—'} → ${data.port_of_discharge ?? '—'}`} />
            ) : null}
            {data.vessel && <Info label="Vessel" value={data.vessel} />}
            {data.notes && <Info label="Notes" value={data.notes} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Packages" value={String(data.total_packages)} />
            <Info label="Total weight" value={`${Number(data.total_weight_kg).toFixed(2)} kg`} />
            <Info label="Total volume" value={`${Number(data.total_volume_cbm).toFixed(2)} cbm`} />
            <div>
              <StatusBadge status={data.status} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">HS Code</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Packages</th>
                  <th className="py-2 pr-4 text-right">Weight (kg)</th>
                  <th className="py-2 text-right">Volume (cbm)</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-line/50 last:border-0">
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4">{item.hsn_code ?? '—'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.quantity} {item.unit}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.package_count}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{Number(item.weight_kg).toFixed(2)}</td>
                    <td className="py-2 text-right tabular-nums">{Number(item.volume_cbm).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
