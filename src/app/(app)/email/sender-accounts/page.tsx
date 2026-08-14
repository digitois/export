'use client';

import { useEffect, useState } from 'react';
import { Send, Plus, Trash2, Loader2, Mail, ShieldCheck, Power, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SenderAccount {
  id: string;
  provider: 'ses' | 'gmail';
  email: string;
  display_name?: string | null;
  daily_send_limit: number;
  sent_today: number;
  is_active: boolean;
  is_verified: boolean;
  aws_region?: string | null;
  bounce_rate?: number;
  complaint_rate?: number;
}

export default function SenderAccountsPage() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [provider, setProvider] = useState<'ses' | 'gmail'>('ses');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [awsRegion, setAwsRegion] = useState('us-east-1');

  async function load() {
    try {
      const res = await api<{ data: SenderAccount[] }>('/api/email/sender-accounts');
      setAccounts(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sender accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      if (provider === 'ses') {
        await api('/api/email/sender-accounts', {
          method: 'POST',
          body: {
            action: 'ses',
            input: { email: email.trim(), display_name: displayName.trim() || undefined, daily_send_limit: Number(dailyLimit) || 1000, aws_region: awsRegion }
          }
        });
      } else {
        await api('/api/email/sender-accounts', {
          method: 'POST',
          body: {
            action: 'gmail',
            input: { email: email.trim(), display_name: displayName.trim() || undefined, daily_send_limit: Number(dailyLimit) || 500, refresh_token: 'configure-oauth' }
          }
        });
      }
      toast.success(`${provider.toUpperCase()} sender added`);
      setShowForm(false);
      setEmail('');
      setDisplayName('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add sender account');
    }
  }

  async function toggleActive(acc: SenderAccount) {
    try {
      await api('/api/email/sender-accounts', {
        method: 'PATCH',
        body: { id: acc.id, updates: { is_active: !acc.is_active } }
      });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm('Remove this sender account?')) return;
    try {
      await api(`/api/email/sender-accounts?id=${id}`, { method: 'DELETE' });
      toast.success('Sender account removed');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  async function testAccount(id: string) {
    try {
      await api('/api/email/sender-accounts', { method: 'POST', body: { action: 'test', accountId: id } });
      toast.success('Test email queued');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    }
  }

  const verifiedCount = accounts.filter(a => a.is_verified).length;
  const activeCount = accounts.filter(a => a.is_active).length;
  const dailyUsage = accounts.reduce((s, a) => s + (a.sent_today ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Sender Accounts" description="Connect SES or Gmail to send emails from your domain.">
        <Button onClick={() => setShowForm(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Sender
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createAccount} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as 'ses' | 'gmail')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                      <SelectItem value="gmail">Gmail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marketing@yourdomain.com" required />
                </div>
                <div className="space-y-1">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="space-y-1">
                  <Label>Daily Send Limit</Label>
                  <Input type="number" min={1} value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} />
                </div>
                {provider === 'ses' && (
                  <div className="space-y-1">
                    <Label>AWS Region</Label>
                    <Input value={awsRegion} onChange={e => setAwsRegion(e.target.value)} placeholder="us-east-1" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Add Sender</Button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Senders" value={accounts.length} icon={Send} description="Total connected" />
            <StatCard title="Verified" value={verifiedCount} icon={ShieldCheck} description="Ready to send" />
            <StatCard title="Active" value={activeCount} icon={Power} description="Currently enabled" />
            <StatCard title="Sent Today" value={dailyUsage} icon={Mail} description="Across all senders" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {accounts.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No sender accounts yet. Add an SES or Gmail sender to start emailing.</p>
                </CardContent>
              </Card>
            )}
            {accounts.map(acc => (
              <Card key={acc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{acc.display_name || acc.email}</CardTitle>
                      <CardDescription>{acc.email} · {acc.provider.toUpperCase()}</CardDescription>
                    </div>
                    <Badge variant={acc.is_verified ? 'default' : 'secondary'}>{acc.is_verified ? 'Verified' : 'Pending'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{acc.sent_today}/{acc.daily_send_limit} today</Badge>
                    {acc.aws_region && <Badge variant="outline">region: {acc.aws_region}</Badge>}
                    {acc.bounce_rate !== undefined && <Badge variant="outline">bounce {acc.bounce_rate}%</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(acc)}>
                      <Power className="mr-1 h-3.5 w-3.5" /> {acc.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => testAccount(acc.id)}>
                      <FlaskConical className="mr-1 h-3.5 w-3.5" /> Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteAccount(acc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}