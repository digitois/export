'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Zap, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
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

interface Stats {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
}

interface SingleResult {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
  provider: string;
  cached: boolean;
}

export default function VerificationPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, valid: 0, invalid: 0, risky: 0, unknown: 0 });
  const [loading, setLoading] = useState(true);

  const [singleEmail, setSingleEmail] = useState('');
  const [singleProvider, setSingleProvider] = useState('reoon');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SingleResult | null>(null);

  const [listId, setListId] = useState('');
  const [lists, setLists] = useState<{ id: string; name: string; contact_count?: number }[]>([]);
  const [bulkProvider, setBulkProvider] = useState('local');
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<any>(null);
  const [startingBulk, setStartingBulk] = useState(false);

  async function loadStats() {
    try {
      const res = await api<{ data: Stats }>('/api/email/verification?scope=stats');
      setStats(res.data ?? { total: 0, valid: 0, invalid: 0, risky: 0, unknown: 0 });
    } catch {
      setStats({ total: 0, valid: 0, invalid: 0, risky: 0, unknown: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    api<{ data: { id: string; name: string; contact_count?: number }[] }>('/api/email/lists')
      .then(res => setLists(res.data))
      .catch(() => setLists([]));
  }, []);

  async function runSingleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await api<{ data: SingleResult }>('/api/email/verification', {
        method: 'POST',
        body: { action: 'check', email: singleEmail.trim(), provider: singleProvider }
      });
      setResult(res.data);
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(async () => {
      try {
        const res = await api<{ data: any }>(`/api/email/verification?jobId=${jobId}`);
        setJob(res.data);
        if (res.data?.state === 'completed' || res.data?.state === 'failed') {
          clearInterval(timer);
          loadStats();
        }
      } catch { clearInterval(timer); }
    }, 2000);
    return () => clearInterval(timer);
  }, [jobId]);

  async function startBulk() {
    setStartingBulk(true);
    try {
      const res = await api<{ data: { jobId: string } }>('/api/email/verification', {
        method: 'POST',
        body: { action: 'bulk-verify', listId: listId || undefined, provider: bulkProvider }
      });
      setJobId(res.data.jobId);
      setJob({ state: 'pending', progress: 0 });
      toast.success('Bulk verification started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start bulk verification');
    } finally {
      setStartingBulk(false);
    }
  }

  const resultIcon =
    result?.status === 'valid' ? <CheckCircle2 className="h-5 w-5 text-pos" /> :
    result?.status === 'invalid' ? <XCircle className="h-5 w-5 text-neg" /> :
    result?.status === 'risky' ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
    <HelpCircle className="h-5 w-5 text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Email Verification" description="Validate email deliverability before you send." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Checked" value={stats.total} icon={ShieldCheck} description="All contacts" />
            <StatCard title="Valid" value={stats.valid} icon={CheckCircle2} description="Deliverable addresses" />
            <StatCard title="Invalid" value={stats.invalid} icon={XCircle} description="Rejected addresses" />
            <StatCard title="Risky" value={stats.risky} icon={AlertTriangle} description="Catch-all / unknown" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> Single Check</CardTitle>
                <CardDescription>Verify one email address instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={runSingleCheck} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-1">
                      <Label>Email</Label>
                      <Input type="email" value={singleEmail} onChange={e => setSingleEmail(e.target.value)} placeholder="buyer@example.com" required />
                    </div>
                    <div className="space-y-1">
                      <Label>Provider</Label>
                      <Select value={singleProvider} onValueChange={setSingleProvider}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reoon">Reoon</SelectItem>
                          <SelectItem value="neverbounce">NeverBounce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={checking}>
                      {checking && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      {checking ? 'Checking...' : 'Verify'}
                    </Button>
                  </div>
                </form>

                {result && (
                  <div className={`flex items-center gap-3 rounded-lg border p-4 ${result.status === 'valid' ? 'border-pos/30 bg-pos/5' : ''}`}>
                    {resultIcon}
                    <div>
                      <p className="text-sm font-medium capitalize">{result.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.isDeliverable ? 'Deliverable' : 'Not deliverable'} · {result.provider} provider
                        {result.cached ? ' · cached' : ''}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Bulk Verify</CardTitle>
                <CardDescription>Verify your entire list in the background.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>List</Label>
                    <Select value={listId} onValueChange={setListId}>
                      <SelectTrigger><SelectValue placeholder="All contacts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All contacts</SelectItem>
                        {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Provider</Label>
                    <Select value={bulkProvider} onValueChange={setBulkProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local (syntax + MX)</SelectItem>
                        <SelectItem value="reoon">Reoon</SelectItem>
                        <SelectItem value="neverbounce">NeverBounce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={startBulk} disabled={startingBulk}>
                  {startingBulk ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1 h-3.5 w-3.5" />}
                  Start Bulk Verification
                </Button>

                {job && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium capitalize">{job.state}</p>
                      <Badge variant="outline">{job.progress ?? 0}%</Badge>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${job.progress ?? 0}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {job.checked_count ?? 0}/{job.total_contacts ?? 0} checked · {job.valid_count ?? 0} valid
                      {' '}· {job.invalid_count ?? 0} invalid · {job.risky_count ?? 0} risky
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}