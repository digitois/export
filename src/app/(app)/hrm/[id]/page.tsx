'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, User, Briefcase, MapPin, Wallet, Landmark, CalendarDays } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import EmployeeForm from '@/components/hrm/employee-form';

interface EmployeeDetail {
  id: string;
  employee_code: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  joining_date?: string | null;
  status: string;
  base_salary: number;
  currency: string;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_ifsc?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiData<EmployeeDetail>(`/api/hrm/employees/${params.id}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load employee'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleDelete() {
    if (!window.confirm('Delete this employee? This also removes their attendance, leave and payroll records.')) return;
    setDeleting(true);
    try {
      await api(`/api/hrm/employees/${params.id}`, { method: 'DELETE' });
      toast.success('Employee deleted');
      router.push('/hrm');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete employee');
      setDeleting(false);
    }
  }

  if (loading) return <Loading label="Loading employee..." />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Employee not found.</div>;

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Edit ${data.full_name}`} description="Update employee details" />
        <EmployeeForm
          mode="edit"
          id={data.id}
          initial={{
            fullName: data.full_name,
            email: data.email,
            phone: data.phone,
            designation: data.designation,
            department: data.department,
            joiningDate: data.joining_date,
            status: data.status,
            baseSalary: Number(data.base_salary ?? 0),
            currency: data.currency,
            bankName: data.bank_name,
            bankAccount: data.bank_account,
            bankIfsc: data.bank_ifsc,
            address: data.address,
            notes: data.notes
          }}
        />
      </div>
    );
  }

  const salary = new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency }).format(data.base_salary);

  return (
    <div className="space-y-6">
      <PageHeader title={data.full_name} description={`${data.employee_code} · Added ${formatDate(data.created_at)}`}>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="destructive" disabled={deleting} onClick={handleDelete}><Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Status" value={data.status} icon={Briefcase} />
            <Info label="Designation" value={data.designation ?? 'Not specified'} icon={User} />
            <Info label="Department" value={data.department ?? 'Not specified'} icon={Briefcase} />
            <Info label="Email" value={data.email ?? 'Not specified'} icon={User} />
            <Info label="Phone" value={data.phone ?? 'Not specified'} icon={User} />
            <Info label="Joining date" value={data.joining_date ? formatDate(data.joining_date) : 'Not specified'} icon={CalendarDays} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Compensation</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Info label="Base salary" value={salary} icon={Wallet} />
              <Info label="Bank" value={data.bank_name ?? 'Not specified'} icon={Landmark} />
              <Info label="Account" value={data.bank_account ?? 'Not specified'} icon={Landmark} />
              <Info label="IFSC / Sort code" value={data.bank_ifsc ?? 'Not specified'} icon={Landmark} />
            </CardContent>
          </Card>
          {data.address && (
            <Card>
              <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
              <CardContent className="text-sm"><Info label="Address" value={data.address} icon={MapPin} /></CardContent>
            </Card>
          )}
        </div>
      </div>

      {data.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle><CardDescription /></CardHeader>
          <CardContent className="text-sm">{data.notes}</CardContent>
        </Card>
      )}
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
