'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, MapPin, Package } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import WarehouseForm from '@/components/warehouses/warehouse-form';

interface WarehouseDetail {
  id: string;
  name: string;
  location?: string | null;
  is_default: boolean;
  created_at: string;
}

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<WarehouseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<WarehouseDetail>(`/api/warehouses/${params.id}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load warehouse'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this warehouse?')) return;
    setDeleting(true);
    try {
      await api(`/api/warehouses/${params.id}`, { method: 'DELETE' });
      toast.success('Warehouse deleted');
      router.push('/warehouses');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete warehouse');
      setDeleting(false);
    }
  }

  if (loading) return <Loading label="Loading warehouse..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Warehouse not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.name}`} description="Update warehouse details" />
        <WarehouseForm mode="edit" id={data.id} initial={{ name: data.name, location: data.location, isDefault: data.is_default }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={data.name} description={`Created ${formatDate(data.created_at)}`}>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="destructive" disabled={deleting} onClick={handleDelete}><Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Location" value={data.location ?? 'Not specified'} icon={MapPin} />
            <Info label="Default warehouse" value={data.is_default ? 'Yes' : 'No'} icon={Package} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}