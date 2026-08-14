'use client';

import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, Loader2, Power, History, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface Trigger {
  id: string;
  name: string;
  event_type: string;
  is_active: boolean;
  fired_count: number;
  enrolled_count: number;
  skipped_count: number;
  last_fired_at?: string | null;
  sequences?: { name?: string } | null;
}
interface SequenceOption { id: string; name: string; }

const EVENTS = [
  'lead_created',
  'lead_status_changed',
  'inquiry_received',
  'contact_created',
  'email_opened',
  'email_clicked',
  'sequence_completed'
];

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [sequences, setSequences] = useState<SequenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState(EVENTS[0]);
  const [sequenceId, setSequenceId] = useState('');

  async function load() {
    try {
      const [trigRes, seqRes] = await Promise.all([
        api<{ data: Trigger[] }>('/api/email/triggers'),
        api<{ data: SequenceOption[] }>('/api/email/sequences')
      ]);
      setTriggers(trigRes.data);
      setSequences(seqRes.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load triggers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createTrigger(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sequenceId) return;
    try {
      await api('/api/email/triggers', {
        method: 'POST',
        body: {
          action: 'create',
          input: {
            name: name.trim(),
            event_type: eventType,
            conditions: [],
            condition_logic: 'and',
            sequence_id: sequenceId
          }
        }
      });
      toast.success('Trigger created');
      setShowForm(false);
      setName('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create trigger');
    }
  }

  async function toggleActive(trig: Trigger) {
    try {
      await api('/api/email/triggers', {
        method: 'PATCH',
        body: { id: trig.id, updates: { is_active: !trig.is_active } }
      });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteTrigger(id: string) {
    if (!confirm('Delete this trigger?')) return;
    try {
      await api(`/api/email/triggers?id=${id}`, { method: 'DELETE' });
      toast.success('Trigger deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function formatEvent(ev: string) {
    return ev.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Triggers" description="Automatically enroll contacts into sequences when events happen.">
        <Button onClick={() => setShowForm(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> New Trigger
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createTrigger} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Trigger Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Welcome new buyer" required />
                </div>
                <div className="space-y-1">
                  <Label>Event</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENTS.map(ev => <SelectItem key={ev} value={ev}>{formatEvent(ev)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Run Sequence</Label>
                  <Select value={sequenceId} onValueChange={setSequenceId}>
                    <SelectTrigger><SelectValue placeholder="Select sequence" /></SelectTrigger>
                    <SelectContent>
                      {sequences.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Create Trigger</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {triggers.length ? triggers.map(trig => (
                <div key={trig.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{trig.name}</p>
                      <Badge variant={trig.is_active ? 'default' : 'secondary'}>{trig.is_active ? 'Active' : 'Paused'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      On <span className="font-medium">{formatEvent(trig.event_type)}</span>
                      {trig.sequences?.name && <> → <span className="font-medium">{trig.sequences.name}</span></>}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> {trig.fired_count} fired</span>
                      <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {trig.enrolled_count} enrolled</span>
                      <span className="inline-flex items-center gap-1"><History className="h-3 w-3" /> {trig.last_fired_at ? formatDate(trig.last_fired_at) : 'never'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(trig)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteTrigger(trig.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No triggers yet. Create one to automate enrollments.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}