'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Mail, Plus, Trash2, Loader2, Users, Pause, Play, Ban, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Step {
  id: string;
  type: 'wait' | 'send_email';
  position: number;
  delay_value?: number | null;
  delay_unit?: string | null;
  template_id?: string | null;
}
interface Enrollment {
  id: string;
  status: string;
  started_at: string;
  email_contacts?: { email?: string; first_name?: string | null; last_name?: string | null } | null;
}
interface TemplateOption { id: string; name: string; }

const DELAY_UNITS = ['minutes', 'hours', 'days'];

export default function SequenceBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sequenceId = params.id;

  const [sequence, setSequence] = useState<any>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [stepType, setStepType] = useState<'wait' | 'send_email'>('wait');
  const [delayValue, setDelayValue] = useState('1');
  const [delayUnit, setDelayUnit] = useState('days');
  const [templateId, setTemplateId] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  async function load() {
    try {
      const [seqRes, tplRes] = await Promise.all([
        api<{ data: any }>(`/api/email/sequences?id=${sequenceId}`),
        api<{ data: TemplateOption[] }>('/api/email/templates')
      ]);
      setSequence(seqRes.data);
      setSteps(seqRes.data.steps ?? []);
      setEnrollments(seqRes.data.enrollments ?? []);
      setTemplates(tplRes.data);
      setStepType(seqRes.data.steps?.length === 0 ? 'send_email' : 'wait');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sequence');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        action: 'add-step',
        sequenceId,
        type: stepType
      };
      if (stepType === 'wait') {
        payload.delay_value = Number(delayValue) || 1;
        payload.delay_unit = delayUnit;
      } else {
        payload.template_id = templateId || null;
      }
      await api('/api/email/sequences', { method: 'POST', body: payload });
      toast.success('Step added');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add step');
    }
  }

  async function removeStep(stepId: string) {
    if (!confirm('Remove this step?')) return;
    try {
      await api(`/api/email/sequences?stepId=${stepId}`, { method: 'DELETE' });
      toast.success('Step removed');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove step');
    }
  }

  async function enroll() {
    if (!contactEmail.trim()) return;
    try {
      const contacts = await api<{ data: { id: string; email: string }[] }>('/api/email/contacts');
      const contact = (contacts.data ?? []).find(c => c.email.toLowerCase() === contactEmail.trim().toLowerCase());
      if (!contact) {
        toast.error('Contact not found — add it to a list first');
        return;
      }
      await api('/api/email/sequences', {
        method: 'POST',
        body: { action: 'enroll', sequenceId, contactId: contact.id }
      });
      toast.success('Contact enrolled');
      setContactEmail('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll contact');
    }
  }

  async function enrollmentAction(enrollmentId: string, op: 'pause' | 'resume' | 'stop') {
    try {
      await api('/api/email/sequences', {
        method: 'PATCH',
        body: { action: 'enrollment-action', sequenceId, enrollmentId, op }
      });
      toast.success('Enrollment updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update enrollment');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/email/sequences')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Sequence not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push('/email/sequences')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{sequence.name}</h1>
          <p className="text-sm text-muted-foreground">
            {steps.length} steps · {enrollments.length} enrolled · {sequence.open_count ?? 0} opens
          </p>
        </div>
        <Badge variant={sequence.is_active ? 'default' : 'secondary'} className="ml-auto">
          {sequence.is_active ? 'Active' : 'Paused'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Builder */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Steps</CardTitle>
              <CardDescription>Each step either waits, then sends an email from a template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No steps yet. Add a step to build your sequence.
                </p>
              )}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-weak text-xs font-semibold text-primary">{index + 1}</span>
                      {step.type === 'wait' ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Wait <strong>{step.delay_value}</strong> {step.delay_unit}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Send email{step.template_id ? ' · ' + templates.find(t => t.id === step.template_id)?.name : ''}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeStep(step.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Step</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addStep} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Step Type</Label>
                    <Select value={stepType} onValueChange={(v) => setStepType(v as 'wait' | 'send_email')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wait">Wait (delay)</SelectItem>
                        <SelectItem value="send_email">Send email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {stepType === 'wait' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Delay</Label>
                        <Input type="number" min={1} value={delayValue} onChange={e => setDelayValue(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Unit</Label>
                        <Select value={delayUnit} onValueChange={setDelayUnit}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DELAY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label>Template</Label>
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                        <SelectContent>
                          {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Enrollments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="Contact email to enroll"
              />
              <Button type="button" onClick={enroll}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {enrollments.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No enrollments yet.
                </p>
              )}
              {enrollments.map(enc => (
                <div key={enc.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {enc.email_contacts?.first_name || enc.email_contacts?.email || 'Unknown contact'}
                    </p>
                    <p className="text-xs text-muted-foreground">{enc.email_contacts?.email}</p>
                    <Badge variant="outline" className="mt-1">{enc.status}</Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {enc.status === 'active' && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => enrollmentAction(enc.id, 'pause')}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => enrollmentAction(enc.id, 'stop')}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {enc.status === 'paused' && (
                      <Button size="icon" variant="ghost" onClick={() => enrollmentAction(enc.id, 'resume')}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {enc.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-pos" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}