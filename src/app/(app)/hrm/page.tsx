'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Briefcase, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';

interface EmployeeRow {
  id: string;
  employee_code: string;
  full_name: string;
  email?: string | null;
  designation?: string | null;
  department?: string | null;
  status: 'active' | 'on_leave' | 'terminated';
  base_salary: number;
  currency: string;
  joining_date?: string | null;
  created_at: string;
}

export default function HrmPage() {
  const [items, setItems] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: EmployeeRow[] }>('/api/hrm/employees')
      .then((res) => { if (!cancelled) setItems(res.data); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load employees'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this employee? This also removes their attendance, leave and payroll records.')) return;
    setDeleting(id);
    try {
      await api(`/api/hrm/employees/${id}`, { method: 'DELETE' });
      toast.success('Employee deleted');
      setItems((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <Loading label="Loading employees..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="HRM" description="Manage your workforce, attendance, leave and payroll">
        <Button asChild><Link href="/hrm/new"><Plus className="h-4 w-4" /> New Employee</Link></Button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No employees yet" description="Add your team members to start tracking attendance, leave and payroll." action={<Button asChild><Link href="/hrm/new"><Plus className="h-4 w-4" /> New Employee</Link></Button>} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/hrm/${e.id}`} className="font-medium hover:underline">{e.full_name}</Link>
                      <div className="text-xs text-muted-foreground">{e.employee_code}</div>
                    </TableCell>
                    <TableCell>{e.designation ?? '—'}</TableCell>
                    <TableCell>{e.department ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell>{e.base_salary != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: e.currency ?? 'USD' }).format(e.base_salary) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/hrm/${e.id}`}><Pencil className="h-4 w-4" /> View / Edit</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive disabled={deleting === e.id} onClick={() => handleDelete(e.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === e.id ? 'Deleting...' : 'Delete'}
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
