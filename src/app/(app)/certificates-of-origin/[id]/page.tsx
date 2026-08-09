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
import { COO_TYPES } from '@/lib/constants';
import CertificateOfOriginForm from '@/components/certificates/certificate-form';

interface CertificateDetail {
  id: string;
  coo_number: string;
  certificate_type: string;
  buyer_name: string;
  buyer_company?: string | null;
  buyer_address?: string | null;
  buyer_country?: string | null;
  exporter_iec?: string | null;
  country_of_origin: string;
  country_of_destination?: string | null;
  issued_date: string;
  status: string;
  notes?: string | null;
  created_at: string;
  items?: Array<{
    id: string;
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit?: string | null;
    unit_value: number;
    gross_weight_kg: number;
    net_weight_kg: number;
  }>;
}

export default function CertificateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<CertificateDetail>(`/api/certificates-of-origin/${params.id}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load certificate'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this certificate?')) return;
    setDeleting(true);
    try {
      await api(`/api/certificates-of-origin/${params.id}`, { method: 'DELETE' });
      toast.success('Certificate deleted');
      router.push('/certificates-of-origin');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete certificate');
      setDeleting(false);
    }
  }

  if (loading) return <Loading label="Loading certificate..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Certificate not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.coo_number}`} description="Update certificate details" />
        <CertificateOfOriginForm
          mode="edit"
          id={data.id}
          initial={{
            certificateType: data.certificate_type,
            buyerName: data.buyer_name,
            buyerCompany: data.buyer_company ?? null,
            buyerAddress: data.buyer_address ?? null,
            buyerCountry: data.buyer_country ?? null,
            exporterIec: data.exporter_iec ?? null,
            countryOfOrigin: data.country_of_origin,
            countryOfDestination: data.country_of_destination ?? null,
            issuedDate: data.issued_date,
            notes: data.notes ?? null,
            items: (data.items ?? []).map((i) => ({
              description: i.description,
              hsnCode: i.hsn_code ?? null,
              quantity: i.quantity,
              unit: i.unit ?? null,
              unitValue: i.unit_value,
              grossWeightKg: i.gross_weight_kg,
              netWeightKg: i.net_weight_kg
            }))
          }}
        />
      </div>
    );
  }

  const totalValue = (data.items ?? []).reduce((s, i) => s + i.quantity * i.unit_value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.coo_number}
        description={`${COO_TYPES.find((t) => t.value === data.certificate_type)?.label ?? data.certificate_type} · issued ${formatDate(data.issued_date)}`}
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
            <CardTitle className="text-base">Parties & route</CardTitle>
            <CardDescription>Exporter and consignee details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {data.exporter_iec && <Info label="Exporter IEC" value={data.exporter_iec} />}
            <Info label="Consignee" value={[data.buyer_name, data.buyer_company, data.buyer_address, data.buyer_country].filter(Boolean).join(' · ')} />
            <Info label="Route" value={`${data.country_of_origin} → ${data.country_of_destination ?? '—'}`} />
            {data.notes && <Info label="Notes" value={data.notes} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Declared value" value={totalValue.toFixed(2)} />
            <Info label="Line items" value={String(data.items?.length ?? 0)} />
            <div>
              <StatusBadge status={data.status} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Goods</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">HS Code</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Unit value</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4 text-right">Gross (kg)</th>
                  <th className="py-2 text-right">Net (kg)</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-line/50 last:border-0">
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4">{item.hsn_code ?? '—'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.quantity} {item.unit}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.unit_value.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{(item.quantity * item.unit_value).toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.gross_weight_kg.toFixed(2)}</td>
                    <td className="py-2 text-right tabular-nums">{item.net_weight_kg.toFixed(2)}</td>
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
