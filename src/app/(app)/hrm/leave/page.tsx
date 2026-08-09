'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Trash2, Loader2, Check, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';

interface EmployeeRef { id: string; employee_code: string; full_name: string; }

interface LeaveRow {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string | null;
  status: string;
  employees?: { id: string; employee_code: string; full_name: string } | null;
}

export default function LeavePage() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ data: LeaveRow[] }>('/api/hrm/leave'),
      api<{ data: EmployeeRef[] }>('/api/hrm/employees')
    ])
      .then(([lv, emp]) => {
        if (!cancelled) {
          setRows(lv.data);
          setEmployees(emp.data);
          if (emp.data.length > 0) setEmployeeId(emp.data[0].id);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load leave requests'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) { toast.error('Select employee, start and end date'); return; }
    setSaving(true);
    try {
      await api('/api/hrm/leave', {
        method: 'POST',
        body: { employeeId, leaveType, startDate, endDate, reason: reason || null }
      });
      toast.success('Leave request created');
      setStartDate('');
      setEndDate('');
      setReason('');
      const [lv] = await Promise.all([api<{ data: LeaveRow[] }>('/api/hrm/leave')]);
      setRows(lv.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create leave request');
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    try {
      await api(`/api/hrm/leave/${id}`, { method: 'PATCH', body: { status } });
      toast.success(`Leave ${status}`);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update leave request');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await api(`/api/hrm/leave/${id}`, { method: 'DELETE' });
      toast.success('Leave request deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete leave request');
    }
  }

  if (loading) return <Loading label="Loading leave requests..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Leave" description="Request, approve and manage employee leave" />

      <Card>
        <CardHeader><CardTitle className="text-base">New leave request</CardTitle><CardDescription>Create a leave request for an employee.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>Reason</Label>
              <Textarea rows={1} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving || employees.length === 0} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No leave requests yet" description="Create a leave request above to get started." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.full_name ?? 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{r.leave_type}</TableCell>
                    <TableCell className="text-sm">{r.start_date} → {r.end_date}</TableCell>
                    <TableCell className="text-sm">{r.days}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {r.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-pos" title="Approve" onClick={() => handleReview(r.id, 'approved')}><Check className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neg" title="Reject" onClick={() => handleReview(r.id, 'rejected')}><X className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
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
