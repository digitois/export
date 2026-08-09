'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calculator, Trash2, ArrowRight } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { INCOTERMS, CURRENCIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface CostResult {
  incoterm: string;
  landedCost: number;
  unitCost: number;
  freight: number;
  insurance: number;
  duty: number;
  otherCharges: number;
  productValue: number;
}

interface SavedEstimate {
  id: string;
  name: string;
  currency: string;
  incoterm: string;
  product_value: number;
  freight: number;
  insurance: number;
  duty_rate: number;
  other_charges: number;
  quantity: number;
  result: CostResult | null;
  created_at: string;
}

export default function LandedCostPage() {
  const [productValue, setProductValue] = useState('10000');
  const [freight, setFreight] = useState('800');
  const [insurance, setInsurance] = useState('200');
  const [dutyRate, setDutyRate] = useState('10');
  const [otherCharges, setOtherCharges] = useState('150');
  const [quantity, setQuantity] = useState('1000');
  const [incoterm, setIncoterm] = useState('FOB');
  const [currency, setCurrency] = useState('USD');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<CostResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<CostResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedEstimate[]>([]);

  const payload = () => ({
    productValue: Number(productValue || 0),
    freight: Number(freight || 0),
    insurance: Number(insurance || 0),
    dutyRate: Number(dutyRate || 0),
    otherCharges: Number(otherCharges || 0),
    quantity: Number(quantity || 0),
    incoterm
  });

  function calculate() {
    apiData<CostResult[]>('/api/landed-cost/compare', { method: 'POST', body: payload() })
      .then((res) => {
        const match = res.find((r) => r.incoterm === incoterm);
        if (match) setResult(match);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to calculate'));
  }

  async function compareAll() {
    setComparing(true);
    try {
      const res = await apiData<CostResult[]>('/api/landed-cost/compare', {
        method: 'POST',
        body: payload()
      });
      setComparison(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to compare incoterms');
    } finally {
      setComparing(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast.error('Give this estimate a name before saving');
      return;
    }
    setSaving(true);
    try {
      await api('/api/landed-cost', {
        method: 'POST',
        body: { ...payload(), name, notes: notes || null, currency }
      });
      toast.success('Estimate saved');
      loadSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save estimate');
    } finally {
      setSaving(false);
    }
  }

  async function loadSaved() {
    try {
      const res = await api<{ data: SavedEstimate[] }>('/api/landed-cost?pageSize=20');
      setSaved(res.data);
    } catch {
      setSaved([]);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this estimate?')) return;
    try {
      await api(`/api/landed-cost/${id}`, { method: 'DELETE' });
      toast.success('Estimate deleted');
      loadSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete estimate');
    }
  }

  const numInputs: Array<{ key: string; label: string; value: string; set: (v: string) => void; hint?: string }> = [
    { key: 'pv', label: 'Product value', value: productValue, set: setProductValue },
    { key: 'fr', label: 'Freight', value: freight, set: setFreight },
    { key: 'in', label: 'Insurance', value: insurance, set: setInsurance },
    { key: 'dr', label: 'Duty rate (%)', value: dutyRate, set: setDutyRate },
    { key: 'oc', label: 'Other charges', value: otherCharges, set: setOtherCharges },
    { key: 'qty', label: 'Quantity (units)', value: quantity, set: setQuantity }
  ];

  useEffect(() => {
    loadSaved();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Landed Cost Calculator" description="Estimate total landed cost and per-unit cost across Incoterms">
        <Button asChild variant="outline" onClick={compareAll} disabled={comparing}>
          <span><ArrowRight className="h-4 w-4" />{comparing ? 'Comparing...' : 'Compare all Incoterms'}</span>
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost inputs</CardTitle>
              <CardDescription>Enter your base costs; duty is computed on CIF value (goods + freight + insurance).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {numInputs.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input type="number" min={0} step="any" value={f.value} onChange={(e) => f.set(e.target.value)} />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Incoterm</Label>
                <Select value={incoterm} onValueChange={setIncoterm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Save for later</CardTitle>
              <CardDescription>Persist this estimate to compare against future quotes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label>Estimate name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brake pads to Rotterdam" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <Button type="button" onClick={save} disabled={saving}>
                  <Calculator className="h-4 w-4" />{saving ? 'Saving...' : 'Save estimate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
              <CardDescription>Landed cost for {incoterm || '—'}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result ? (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total landed cost</p>
                      <p className="text-2xl font-semibold">{formatCurrency(result.landedCost, currency)}</p>
                    </div>
                    <Badge variant="secondary">{incoterm}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Per unit</p>
                    <p className="text-lg font-semibold">{formatCurrency(result.unitCost, currency)}</p>
                  </div>
                  <div className="space-y-2 border-t border-line pt-3 text-sm">
                    <Row label="Product value" value={formatCurrency(result.productValue, currency)} />
                    <Row label="Freight" value={formatCurrency(result.freight, currency)} />
                    <Row label="Insurance" value={formatCurrency(result.insurance, currency)} />
                    <Row label="Duty" value={formatCurrency(result.duty, currency)} />
                    <Row label="Other charges" value={formatCurrency(result.otherCharges, currency)} />
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Fill in inputs and press Calculate.</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={calculate}><Calculator className="h-4 w-4" />Calculate</Button>
                <Button className="flex-1" variant="outline" onClick={compareAll} disabled={comparing}>
                  {comparing ? 'Comparing...' : 'Compare all'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {comparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Incoterms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {comparison.map((r) => (
                  <div key={r.incoterm} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                    <span className="text-sm font-medium">{r.incoterm}</span>
                    <span className="text-sm tabular-nums">{formatCurrency(r.landedCost, currency)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {saved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved estimates</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line">
            {saved.map((est) => (
              <div key={est.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{est.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {est.incoterm} · {formatCurrency(est.product_value, est.currency)} · saved {new Date(est.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(est.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
