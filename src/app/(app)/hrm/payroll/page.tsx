'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Loader2, Play, CheckCircle2 } from 'lucide-react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';

interface PayrollLine { id: string; employee_id: string; gross: number; allowances: number; deductions: number; net: number; employees?: { full_name: string; employee_code: string } | null; }

interface PayrollRow {
  id: string;
  period_start: string;
  period_end: string;
  run_date: string;
  status: string;
  total_amount: number;
  currency: string;
  payroll_lines?: PayrollLine[];
}

export default function PayrollPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    const [r] = await Promise.all([api<{ data: PayrollRow[] }>('/api/hrm/payroll')]);
    setRows(r.data);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: PayrollRow[] }>('/api/hrm/payroll')
      .then((res) => { if (!cancelled) setRows(res.data); })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load payroll'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) { toast.error('Select a pay period'); return; }
    setCreating(true);
    try {
      const [created] = await Promise.all([
        api<{ data: PayrollRow }>('/api/hrm/payroll', { method: 'POST', body: { periodStart, periodEnd, notes: notes || null } })
      ]);
      toast.success('Payroll run created');
      setPeriodStart('');
      setPeriodEnd('');
      setNotes('');
      await generateLines(created.data.id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payroll run');
    } finally {
      setCreating(false);
    }
  }

  async function generateLines(id: string) {
    setBusyId(id);
    try {
      await api(`/api/hrm/payroll/${id}`, { method: 'POST' });
      toast.success('Payroll lines generated');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate payroll lines');
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    try {
      await api(`/api/hrm/payroll/${id}`, { method: 'PATCH', body: { status: 'paid' } });
      toast.success('Payroll marked as paid');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update payroll');
    } finally {
      setBusyId(null);
    }
  }

  const fmt = (amount: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

  if (loading) return <Loading label="Loading payroll..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Create payroll runs and generate payslips from employee salaries" />

      <Card>
        <CardHeader><CardTitle className="text-base">New payroll run</CardTitle><CardDescription>Pick a period; lines are generated from active employees' base salaries.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                Create Run
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={Banknote} title="No payroll runs yet" description="Create a payroll run above to generate payslips." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {r.period_start} → {r.period_end}
                    </CardTitle>
                    <CardDescription>
                      Run date {r.run_date} · {r.payroll_lines?.length ?? 0} employees · Total {fmt(r.total_amount, r.currency)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => generateLines(r.id)}>
                          {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          {r.payroll_lines?.length ? 'Regenerate' : 'Generate lines'}
                        </Button>
                        <Button size="sm" disabled={busyId === r.id || (r.payroll_lines?.length ?? 0) === 0} onClick={() => markPaid(r.id)}>
                          {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Mark Paid
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              {r.payroll_lines && r.payroll_lines.length > 0 && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Allowances</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.payroll_lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.employees?.full_name ?? l.employee_id}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(l.gross, r.currency)}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(l.allowances, r.currency)}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(l.deductions, r.currency)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmt(l.net, r.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
