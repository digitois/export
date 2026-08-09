'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, Wallet, Plus, Pencil, Trash2, MoreHorizontal
} from 'lucide-react';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EXPENSE_CATEGORIES, CURRENCIES } from '@/lib/constants';

interface FinanceSummary {
  currency: string;
  revenue: number;
  cashIn: number;
  cashOut: number;
  profit: number;
  outstanding: number;
  margins: { expenseCount: number; invoiceCount: number; paymentCount: number; overdueAmount: number };
  byCategory: Array<{ category: string; amount: number; count: number }>;
  monthly: Array<{ month: string; cashIn: number; cashOut: number; revenue: number }>;
}

interface ExpenseRow {
  id: string;
  category: string;
  vendor?: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  notes?: string | null;
  attachment_url?: string | null;
}

const EMPTY_FORM = { category: 'other', vendor: '', amount: '', currency: 'USD', expenseDate: '', notes: '' };

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, expenseDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api<{ data: FinanceSummary }>('/api/finance/summary'),
      api<{ data: ExpenseRow[]; meta: { count: number } }>(`/api/expenses${getSearchParamString({ page, pageSize, q, category })}`)
    ])
      .then(([s, e]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setSummary(s.value.data);
        if (e.status === 'fulfilled') {
          setItems(e.value.data);
          setCount(e.value.meta.count);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load finance data'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, q, category]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, expenseDate: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }

  function openEdit(expense: ExpenseRow) {
    setEditing(expense);
    setForm({
      category: expense.category,
      vendor: expense.vendor ?? '',
      amount: String(expense.amount),
      currency: expense.currency,
      expenseDate: expense.expense_date,
      notes: expense.notes ?? ''
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      category: form.category,
      vendor: form.vendor || null,
      amount: Number(form.amount),
      currency: form.currency,
      expenseDate: form.expenseDate,
      notes: form.notes || null
    };
    try {
      await api(editing ? `/api/expenses/${editing.id}` : '/api/expenses', {
        method: editing ? 'PATCH' : 'POST',
        body
      });
      toast.success(editing ? 'Expense updated' : 'Expense recorded');
      setDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this expense?')) return;
    setDeleting(id);
    try {
      await api(`/api/expenses/${id}`, { method: 'DELETE' });
      toast.success('Expense deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setDeleting(null);
    }
  }

  function reload() {
    setPage(1);
    setQ('');
    setCategory('');
    api<{ data: FinanceSummary }>('/api/finance/summary').then((s) => setSummary(s.data)).catch(() => {});
    api<{ data: ExpenseRow[] }>('/api/expenses?pageSize=20').then((s) => { setItems(s.data); setCount(0); }).catch(() => {});
  }

  const currency = summary?.currency ?? 'USD';
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Expenses ledger, cash flow and a light profit & loss view">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Record Expense
        </Button>
      </PageHeader>

      {loading ? (
        <Loading label="Loading finance data..." />
      ) : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Revenue (invoices)" value={formatCurrency(summary.revenue, currency)} icon={DollarSign} description={`${summary.margins.invoiceCount} invoices`} />
              <StatCard title="Cash In" value={formatCurrency(summary.cashIn, currency)} icon={TrendingUp} description={`${summary.margins.paymentCount} payments`} />
              <StatCard title="Cash Out" value={formatCurrency(summary.cashOut, currency)} icon={TrendingDown} description={`${summary.margins.expenseCount} expenses`} />
              <StatCard title="Profit (revenue − expenses)" value={formatCurrency(summary.profit, currency)} icon={Wallet} description={summary.profit >= 0 ? 'Net positive' : 'Net negative'} />
            </div>
          )}

          {summary && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Cash flow</CardTitle>
                  <CardDescription>Cash in vs cash out, last {summary.monthly.length} months</CardDescription>
                </CardHeader>
                <CardContent>
                  {summary.monthly.some((m) => m.cashIn || m.cashOut) ? (
                    <GroupedBars data={summary.monthly} currency={currency} />
                  ) : (
                    <EmptyState icon={Wallet} title="No cash flow yet" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by category</CardTitle>
                  <CardDescription>Cash out grouped by expense category</CardDescription>
                </CardHeader>
                <CardContent>
                  {summary.byCategory.length ? (
                    <CategoryBreakdown items={summary.byCategory} currency={currency} total={summary.cashOut} />
                  ) : (
                    <EmptyState icon={Wallet} title="No expenses yet" />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {summary && summary.outstanding > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Outstanding on invoices</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(summary.outstanding, currency)} receivable
                      {summary.margins.overdueAmount > 0 && ` · ${formatCurrency(summary.margins.overdueAmount, currency)} overdue`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses</CardTitle>
              <CardDescription>All recorded expenses, most recent first</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  placeholder="Search vendor or notes..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  className="md:max-w-xs"
                />
                <Select value={category} onValueChange={(v) => { setCategory(v === 'all-categories' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="md:w-56"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">All categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {items.length === 0 ? (
                <EmptyState
                  title="No expenses recorded"
                  description="Add your first expense to start tracking cash out."
                  icon={Wallet}
                  action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Record Expense</Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}
                          {expense.notes && <p className="text-xs text-muted-foreground">{expense.notes}</p>}
                        </TableCell>
                        <TableCell>{expense.vendor ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(expense.expense_date)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(expense)}>
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive disabled={deleting === expense.id} onClick={() => handleDelete(expense.id)}>
                                  <Trash2 className="h-4 w-4" /> {deleting === expense.id ? 'Deleting...' : 'Delete'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit expense' : 'Record expense'}</DialogTitle>
            <DialogDescription>Cash out against a category.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Maersk" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupedBars({ data, currency }: { data: FinanceSummary['monthly']; currency: string }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.cashIn, m.cashOut]));
  return (
    <div className="flex h-48 w-full items-end gap-3">
      {data.map((m) => (
        <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(m.cashIn - m.cashOut)}</span>
          <div className="flex h-32 w-full items-end justify-center gap-1">
            <div className="h-full w-3 max-w-full overflow-hidden rounded-t-sm bg-accent-weak">
              <div className="h-full w-full rounded-t-sm bg-pos/80" style={{ height: `${(m.cashIn / max) * 100}%` }} />
            </div>
            <div className="h-full w-3 max-w-full overflow-hidden rounded-t-sm bg-accent-weak">
              <div className="h-full w-full rounded-t-sm bg-neg/70" style={{ height: `${(m.cashOut / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">{m.month}</span>
        </div>
      ))}
      <div className="flex items-end pb-1">
        <div className="flex flex-col gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pos/80" /> In</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neg/70" /> Out</span>
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdown({ items, currency, total }: { items: FinanceSummary['byCategory']; currency: string; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.amount));
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((i) => (
        <div key={i.category} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{EXPENSE_CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category}</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(i.amount, currency)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(i.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {total > 0 && (
        <p className="pt-1 text-xs text-muted-foreground">Total {formatCurrency(total, currency)}</p>
      )}
    </div>
  );
}
