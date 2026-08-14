'use client';

import { useEffect, useState } from 'react';
import { Send, ShieldCheck, Webhook, Loader2, Save, KeyRound, Link2, Plus, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SenderAccount {
  id: string;
  provider: 'ses' | 'gmail';
  email: string;
  display_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
  daily_send_limit: number;
  sent_today: number;
}
interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export default function EmailSettingsPage() {
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // SES key fields
  const [reoonKey, setReoonKey] = useState('');
  const [neverBounceKey, setNeverBounceKey] = useState('');
  const [saveKeys, setSaveKeys] = useState(false);

  // New sender
  const [sesEmail, setSesEmail] = useState('');
  const [gmailEmail, setGmailEmail] = useState('');

  async function load() {
    try {
      const [s, w] = await Promise.all([
        api<{ data: SenderAccount[] }>('/api/email/sender-accounts'),
        api<{ data: WebhookEndpoint[] }>('/api/email/webhooks')
      ]);
      setSenders(s.data);
      setWebhooks(w.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addSes(e: React.FormEvent) {
    e.preventDefault();
    if (!sesEmail.trim()) return;
    try {
      await api('/api/email/sender-accounts', {
        method: 'POST',
        body: { action: 'ses', input: { email: sesEmail.trim() } }
      });
      toast.success('SES sender added');
      setSesEmail('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    }
  }

  async function addGmail(e: React.FormEvent) {
    e.preventDefault();
    if (!gmailEmail.trim()) return;
    try {
      await api('/api/email/sender-accounts', {
        method: 'POST',
        body: { action: 'gmail', input: { email: gmailEmail.trim(), refresh_token: 'configure-oauth' } }
      });
      toast.success('Gmail sender added');
      setGmailEmail('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    }
  }

  async function toggleSender(id: string) {
    const acc = senders.find((s) => s.id === id);
    try {
      await api('/api/email/sender-accounts', {
        method: 'PATCH',
        body: { id, updates: { is_active: !acc?.is_active } }
      });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteSender(id: string) {
    if (!confirm('Remove this sender account?')) return;
    try {
      await api(`/api/email/sender-accounts?id=${id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  async function saveVerificationKeys(e: React.FormEvent) {
    e.preventDefault();
    setSaveKeys(true);
    try {
      await api('/api/email/settings/verification-keys', {
        method: 'POST',
        body: { reoon_key: reoonKey.trim() || null, neverbounce_key: neverBounceKey.trim() || null }
      });
      toast.success('Verification API keys saved');
      setReoonKey('');
      setNeverBounceKey('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save keys');
    } finally {
      setSaveKeys(false);
    }
  }

  if (loading) return <Loading label="Loading email settings..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email Settings" description="Sender accounts, verification providers and webhook endpoints." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sender Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Sender Accounts</CardTitle>
            <CardDescription>Identities used to send campaign and sequence emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addSes} className="flex gap-2">
              <Input value={sesEmail} onChange={(e) => setSesEmail(e.target.value)} placeholder="Add SES sender (email)" />
              <Button type="submit" size="sm">Add SES</Button>
            </form>
            <form onSubmit={addGmail} className="flex gap-2">
              <Input value={gmailEmail} onChange={(e) => setGmailEmail(e.target.value)} placeholder="Add Gmail sender (email)" />
              <Button type="submit" size="sm" variant="outline">Add Gmail</Button>
            </form>
            <div className="space-y-2">
              {senders.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">No senders yet.</p>
              )}
              {senders.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-accent-weak p-2 text-primary"><Mail className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium">{s.email}</p>
                      <p className="text-xs text-muted-foreground">{s.provider.toUpperCase()} · {s.sent_today}/{s.daily_send_limit} today</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.is_verified ? 'default' : 'secondary'}>{s.is_verified ? 'Verified' : 'Pending'}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => toggleSender(s.id)}>
                      {s.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSender(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verification keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verification Providers</CardTitle>
            <CardDescription>API keys for email verification. Stored encrypted server-side.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveVerificationKeys} className="space-y-4">
              <div className="space-y-1">
                <Label>Reoon API Key</Label>
                <Input type="password" value={reoonKey} onChange={(e) => setReoonKey(e.target.value)} placeholder="reoon_..." autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label>NeverBounce API Key</Label>
                <Input type="password" value={neverBounceKey} onChange={(e) => setNeverBounceKey(e.target.value)} placeholder="private_..." autoComplete="off" />
              </div>
              <Button type="submit" disabled={saveKeys}>
                {saveKeys ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1 h-3.5 w-3.5" />}
                Save Keys
              </Button>
              <p className="text-xs text-muted-foreground">
                Keys are stored server-side. Runtime usage goes through your production environment variables, so this
                stores an encrypted override for this organization.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Webhook endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook Endpoints</CardTitle>
          <CardDescription>Where Export OS delivers events to your systems.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {webhooks.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No webhook endpoints. Create them on the <a className="text-primary hover:underline" href="/email/webhooks">Webhooks page</a>.
              </p>
            )}
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{w.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {w.events.slice(0, 3).map((ev) => <Badge key={ev} variant="outline">{ev}</Badge>)}
                  {w.events.length > 3 && <Badge variant="outline">+{w.events.length - 3}</Badge>}
                  <Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Active' : 'Paused'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}