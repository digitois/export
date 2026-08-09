'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Package, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: string[];
  limits: Record<string, unknown>;
  razorpay_plan_id_monthly?: string | null;
  razorpay_plan_id_annual?: string | null;
  is_active: boolean;
  sort_order: number;
}

interface PlanForm {
  name: string;
  code: string;
  description: string;
  priceMonthly: string;
  priceAnnual: string;
  currency: string;
  featuresText: string;
  limitsText: string;
  razorpayPlanIdMonthly: string;
  razorpayPlanIdAnnual: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: PlanForm = {
  name: '',
  code: '',
  description: '',
  priceMonthly: '0',
  priceAnnual: '0',
  currency: 'INR',
  featuresText: '',
  limitsText: '{}',
  razorpayPlanIdMonthly: '',
  razorpayPlanIdAnnual: '',
  isActive: true,
  sortOrder: '0'
};

function planToForm(plan: Plan): PlanForm {
  return {
    name: plan.name,
    code: plan.code,
    description: plan.description ?? '',
    priceMonthly: String(plan.price_monthly ?? 0),
    priceAnnual: String(plan.price_annual ?? 0),
    currency: plan.currency ?? 'INR',
    featuresText: (plan.features ?? []).join('\n'),
    limitsText: JSON.stringify(plan.limits ?? {}, null, 2),
    razorpayPlanIdMonthly: plan.razorpay_plan_id_monthly ?? '',
    razorpayPlanIdAnnual: plan.razorpay_plan_id_annual ?? '',
    isActive: plan.is_active,
    sortOrder: String(plan.sort_order ?? 0)
  };
}

export default function AdminPlansPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: Plan[] }>('/api/admin/plans');
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm(planToForm(plan));
    setDialogOpen(true);
  }

  function parseFeatures(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseLimits(text: string): Record<string, unknown> {
    if (!text.trim()) return {};
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      throw new Error('Limits must be a JSON object');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Invalid limits JSON');
    }
  }

  async function savePlan(e: FormEvent) {
    e.preventDefault();
    let limits: Record<string, unknown>;
    try {
      limits = parseLimits(form.limitsText);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid limits JSON');
      return;
    }

    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      priceMonthly: Number(form.priceMonthly || 0),
      priceAnnual: Number(form.priceAnnual || 0),
      currency: form.currency.trim().toUpperCase() || 'INR',
      features: parseFeatures(form.featuresText),
      limits,
      razorpayPlanIdMonthly: form.razorpayPlanIdMonthly.trim() || null,
      razorpayPlanIdAnnual: form.razorpayPlanIdAnnual.trim() || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder || 0)
    };

    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/plans/${editing.id}`, { method: 'PATCH', body });
        toast.success('Plan updated');
      } else {
        await api('/api/admin/plans', { method: 'POST', body });
        toast.success('Plan created');
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    setDeletingConfirm(true);
    try {
      await api(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
      toast.success('Plan deleted');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan');
    } finally {
      setDeletingConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Plans" description="Manage pricing plans offered across the platform.">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </PageHeader>

      {loading ? (
        <Loading label="Loading plans..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Create your first pricing plan."
          icon={Package}
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Plan</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Annual</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.code}</p>
                    </TableCell>
                    <TableCell>{formatCurrency(plan.price_monthly, plan.currency)}</TableCell>
                    <TableCell>{formatCurrency(plan.price_annual, plan.currency)}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate text-sm text-muted-foreground">
                        {(plan.features ?? []).slice(0, 2).join(' · ') || '-'}
                        {(plan.features ?? []).length > 2 ? ` +${plan.features.length - 2} more` : ''}
                      </p>
                    </TableCell>
                    <TableCell>{plan.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmDelete(plan)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={savePlan} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Plan' : 'New Plan'}</DialogTitle>
              <DialogDescription>
                {editing ? 'Update the plan details below.' : 'Create a new pricing plan.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="starter" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="priceMonthly">Price (monthly)</Label>
                <Input id="priceMonthly" type="number" min="0" step="0.01" value={form.priceMonthly} onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="priceAnnual">Price (annual)</Label>
                <Input id="priceAnnual" type="number" min="0" step="0.01" value={form.priceAnnual} onChange={(e) => setForm((f) => ({ ...f, priceAnnual: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={form.currency} maxLength={3} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rzpMonthly">Razorpay Plan ID (monthly)</Label>
                <Input id="rzpMonthly" value={form.razorpayPlanIdMonthly} onChange={(e) => setForm((f) => ({ ...f, razorpayPlanIdMonthly: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rzpAnnual">Razorpay Plan ID (annual)</Label>
                <Input id="rzpAnnual" value={form.razorpayPlanIdAnnual} onChange={(e) => setForm((f) => ({ ...f, razorpayPlanIdAnnual: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  rows={5}
                  value={form.featuresText}
                  onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
                  placeholder={'Unlimited products\nAI assistant\nEmail marketing'}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="limits">Limits (JSON)</Label>
                <Textarea
                  id="limits"
                  rows={5}
                  value={form.limitsText}
                  onChange={(e) => setForm((f) => ({ ...f, limitsText: e.target.value }))}
                  placeholder='{"products": 50, "users": 5}'
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Available for new signups</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete plan</DialogTitle>
            <DialogDescription>
              "{confirmDelete?.name}" will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deletingConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={deletingConfirm}>
              {deletingConfirm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}