'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { leadSchema } from '@/lib/validations';
import { COUNTRIES, LEAD_SOURCES, LEAD_PRIORITIES, LEAD_STATUSES, CURRENCIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/loading';
import { snakeToCamelObject } from '@/lib/utils';

type LeadInput = z.infer<typeof leadSchema>;

export function LeadForm({ leadId, onSaved }: { leadId?: string; onSaved?: (id: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!leadId);
  const [saving, setSaving] = useState(false);

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      companyName: '',
      buyerName: '',
      email: '',
      phone: '',
      country: '',
      productInterested: '',
      leadValue: null,
      currency: 'USD',
      source: 'manual',
      priority: 'medium',
      status: 'new',
      assignedTo: null,
      notes: ''
    }
  });

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    api<{ data: Record<string, unknown> }>(`/api/leads/${leadId}`)
      .then((res) => {
        if (cancelled) return;
        const d = snakeToCamelObject(res.data) as unknown as LeadInput;
        form.reset({
          companyName: (d.companyName as string) ?? '',
          buyerName: (d.buyerName as string) ?? '',
          email: (d.email as string) ?? '',
          phone: (d.phone as string) ?? '',
          country: (d.country as string) ?? '',
          productInterested: (d.productInterested as string) ?? '',
          leadValue: d.leadValue != null ? Number(d.leadValue) : null,
          currency: (d.currency as string) ?? 'USD',
          source: (d.source as LeadInput['source']) ?? 'manual',
          priority: (d.priority as LeadInput['priority']) ?? 'medium',
          status: (d.status as LeadInput['status']) ?? 'new',
          assignedTo: (d.assignedTo as string) ?? null,
          notes: (d.notes as string) ?? ''
        });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load lead'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, form]);

  async function onSubmit(values: LeadInput) {
    setSaving(true);
    try {
      const res = await api<{ data: { id: string } }>(leadId ? `/api/leads/${leadId}` : '/api/leads', {
        method: leadId ? 'PATCH' : 'POST',
        body: values
      });
      toast.success(leadId ? 'Lead updated' : 'Lead created');
      if (onSaved) onSaved(res.data.id);
      else {
        router.push(`/leads/${res.data.id}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buyer Information</CardTitle>
          <CardDescription>Contact details for the buyer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buyerName">Buyer Name *</Label>
            <Input id="buyerName" {...form.register('buyerName')} />
            {form.formState.errors.buyerName && (
              <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.buyerName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" {...form.register('companyName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={form.watch('country') ?? ''} onValueChange={(v) => form.setValue('country', v)}>
              <SelectTrigger id="country"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="productInterested">Product Interested</Label>
            <Input id="productInterested" {...form.register('productInterested')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadValue">Lead Value</Label>
            <Input id="leadValue" type="number" min={0} step="0.01" {...form.register('leadValue', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={form.watch('currency')} onValueChange={(v) => form.setValue('currency', v)}>
              <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={form.watch('source')} onValueChange={(v) => form.setValue('source', v as LeadInput['source'])}>
              <SelectTrigger id="source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v as LeadInput['priority'])}>
              <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as LeadInput['status'])}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save className="h-4 w-4" />}
          {leadId ? 'Save Changes' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}