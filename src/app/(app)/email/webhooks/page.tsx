'use client';

import { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, Loader2, Power, FlaskConical, History } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  created_at: string;
}
interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  attempt: number;
  response_status?: number | null;
  created_at: string;
}

const EVENT_OPTIONS = ['lead_created', 'email_opened', 'email_clicked', 'sequence_completed', 'inquiry_received'];

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['lead_created']);

  async function load() {
    try {
      const res = await api<{ data: WebhookEndpoint[] }>('/api/email/webhooks');
      setEndpoints(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadDeliveries(id: string) {
    try {
      const res = await api<{ data: WebhookEndpoint & { deliveries: WebhookDelivery[] } }>(
        `/api/email/webhooks?id=${id}&deliveries=true`
      );
      setDeliveries(res.data.deliveries ?? []);
    } catch {
      setDeliveries([]);
    }
  }

  function toggleEvent(ev: string) {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  async function createEndpoint(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim() || events.length === 0) return;
    try {
      await api('/api/email/webhooks', {
        method: 'POST',
        body: { action: 'create', input: { name: name.trim(), url: url.trim(), events } }
      });
      toast.success('Webhook endpoint created');
      setShowForm(false);
      setName('');
      setUrl('');
      setEvents(['lead_created']);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create webhook');
    }
  }

  async function toggleActive(ep: WebhookEndpoint) {
    try {
      await api('/api/email/webhooks', {
        method: 'PATCH',
        body: { id: ep.id, updates: { is_active: !ep.is_active } }
      });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function testEndpoint(id: string) {
    try {
      await api('/api/email/webhooks', { method: 'POST', body: { action: 'test', endpointId: id } });
      toast.success('Test payload sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    }
  }

  async function deleteEndpoint(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return;
    try {
      await api(`/api/email/webhooks?id=${id}`, { method: 'DELETE' });
      toast.success('Webhook deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Webhooks" description="Deliver Export OS events to your own systems in real time.">
        <Button onClick={() => setShowForm(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> New Webhook
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createEndpoint} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Sync to CRM" required />
                </div>
                <div className="space-y-1">
                  <Label>Endpoint URL</Label>
                  <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourapp.com/hooks/exportos" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map(ev => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEvent(ev)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${events.includes(ev) ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:border-primary/50'}`}
                    >
                      {ev.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Create Webhook</Button>
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
        <>
          <div className="grid gap-4">
            {endpoints.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No webhook endpoints yet. Create one to receive events.</p>
                </CardContent>
              </Card>
            )}
            {endpoints.map(ep => (
              <Card key={ep.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base"><Webhook className="h-4 w-4" /> {ep.name}</CardTitle>
                      <CardDescription className="mt-1 font-mono text-xs">{ep.url}</CardDescription>
                    </div>
                    <Badge variant={ep.is_active ? 'default' : 'secondary'}>{ep.is_active ? 'Active' : 'Paused'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {ep.events.map(ev => (
                      <Badge key={ev} variant="outline">{ev.replace(/_/g, ' ')}</Badge>
                    ))}
                    <Badge variant="outline">retries: {ep.retry_count}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadDeliveries(ep.id)}>
                      <History className="mr-1 h-3.5 w-3.5" /> Deliveries
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testEndpoint(ep.id)}>
                      <FlaskConical className="mr-1 h-3.5 w-3.5" /> Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(ep)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteEndpoint(ep.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {deliveries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {deliveries.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{d.event_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.response_status && <Badge variant="outline">{d.response_status}</Badge>}
                        <Badge variant={d.status === 'delivered' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}