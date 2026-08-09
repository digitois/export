'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import SupplierForm from '@/components/suppliers/supplier-form';

interface SupplierDetail {
  id: string;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  gst_number?: string | null;
  payment_terms?: string | null;
  currency: string;
  notes?: string | null;
  created_at: string;
}

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<SupplierDetail>(`/api/suppliers/${params.id}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load supplier'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this supplier?')) return;
    setDeleting(true);
    try { await api(`/api/suppliers/${params.id}`, { method: 'DELETE' }); toast.success('Supplier deleted'); router.push('/suppliers'); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete supplier'); setDeleting(false); }
  }

  if (loading) return <Loading label="Loading supplier..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Supplier not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.name}`} description="Update supplier details" />
        <SupplierForm mode="edit" id={data.id} initial={{ name: data.name, contactPerson: data.contact_person, email: data.email, phone: data.phone, address: data.address, country: data.country, gstNumber: data.gst_number, paymentTerms: data.payment_terms, currency: data.currency, notes: data.notes }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={data.name} description={`Created ${formatDate(data.created_at)}`}><Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button><Button variant="destructive" disabled={deleting} onClick={handleDelete}><Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}</Button></PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
          {data.contact_person && <Info label="Contact" value={data.contact_person} icon={Mail} />}
          {data.email && <Info label="Email" value={data.email} icon={Mail} />}
          {data.phone && <Info label="Phone" value={data.phone} icon={Phone} />}
          {data.address && <Info label="Address" value={data.address} icon={MapPin} />}
          {data.country && <Info label="Country" value={data.country} icon={MapPin} />}
          {data.gst_number && <Info label="GST" value={data.gst_number} icon={CreditCard} />}
          {data.payment_terms && <Info label="Terms" value={data.payment_terms} icon={CreditCard} />}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><Info label="Currency" value={data.currency} icon={CreditCard} /></CardContent></Card>
      </div>
    </div>
  );
}
function Info({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (<div className="flex items-start gap-3"><div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div></div>);
}