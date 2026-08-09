'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck, Trash2, Loader2, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';

interface EmployeeRef { id: string; employee_code: string; full_name: string; }

interface AttendanceRow {
  id: string;
  attendance_date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  hours_worked: number;
  employees?: { id: string; employee_code: string; full_name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  leave: 'Leave'
};

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('present');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ data: AttendanceRow[] }>('/api/hrm/attendance'),
      api<{ data: EmployeeRef[] }>('/api/hrm/employees')
    ])
      .then(([att, emp]) => {
        if (!cancelled) {
          setRows(att.data);
          setEmployees(emp.data);
          if (emp.data.length > 0) setEmployeeId(emp.data[0].id);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load attendance'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function computeHours() {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const ms = end.getTime() - start.getTime();
    if (ms <= 0) return 0;
    return Math.round((ms / 3600000) * 100) / 100;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try {
      await api('/api/hrm/attendance', {
        method: 'POST',
        body: {
          employeeId,
          attendanceDate,
          checkIn: checkIn ? new Date(checkIn).toISOString() : null,
          checkOut: checkOut ? new Date(checkOut).toISOString() : null,
          status,
          hoursWorked: computeHours()
        }
      });
      toast.success('Attendance saved');
      setCheckIn('');
      setCheckOut('');
      const [att] = await Promise.all([api<{ data: AttendanceRow[] }>('/api/hrm/attendance')]);
      setRows(att.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api(`/api/hrm/attendance/${id}`, { method: 'DELETE' });
      toast.success('Attendance record deleted');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete attendance record');
    }
  }

  if (loading) return <Loading label="Loading attendance..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Log daily check-ins, check-outs and attendance status" />

      <Card>
        <CardHeader><CardTitle className="text-base">Log attendance</CardTitle><CardDescription>One record per employee per day.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-6">
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
              <Label>Date</Label>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="half_day">Half day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving || employees.length === 0} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No attendance recorded yet" description="Log your team's attendance above to get started." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.full_name ?? 'Unknown'}</TableCell>
                    <TableCell>{r.attendance_date}</TableCell>
                    <TableCell className="text-sm">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '—'}</TableCell>
                    <TableCell className="text-sm">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '—'}</TableCell>
                    <TableCell className="text-sm">{r.hours_worked ? `${r.hours_worked}h` : '—'}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
