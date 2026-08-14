'use client';

import { useEffect, useState } from 'react';
import {
  Send, MailOpen, MousePointerClick, AlertTriangle, Workflow, ShieldCheck,
  BarChart3, Loader2, Activity, HeartPulse, GitBranch
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SequencePerf {
  id: string;
  name: string;
  is_active: boolean;
  enrolled: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  replied: number;
  completed: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}
interface SenderHealth {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  is_verified: boolean;
  sent_today: number;
  daily_send_limit: number;
  bounce_rate: number;
  complaint_rate: number;
  open_rate: number;
  click_rate: number;
  sent_30d: number;
}
interface VariantPerf {
  id: string;
  name: string;
  is_variant: boolean;
  parent_template_id?: string | null;
  usage_count: number;
  sent: number;
  opened: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}
interface TrendPoint { date: string; sent: number; opened: number; clicked: number; }
interface EmailAnalytics {
  overview: {
    totalSent: number;
    uniqueDelivered: number;
    uniqueOpened: number;
    uniqueClicked: number;
    totalBounced: number;
    totalComplained: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
    sequences: { total: number; active: number; enrolled: number; completed: number };
    verifiedContacts: number;
    invalidContacts: number;
  };
  sequences: SequencePerf[];
  senders: SenderHealth[];
  variants: VariantPerf[];
  trend: TrendPoint[];
}

export default function EmailAnalyticsPage() {
  const [data, setData] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ data: EmailAnalytics }>(`/api/email/analytics?days=${days}`);
      setData(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load email analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  return (
    <div className="space-y-6">
      <PageHeader title="Email Analytics" description="Performance across sequences, sender accounts and templates.">
        <div className="flex items-center gap-1 rounded-lg border border-line p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </PageHeader>

      {loading || !data ? (
        <Loading label="Loading email analytics..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Sent" value={data.overview.totalSent} icon={Send} description="Emails in period" />
            <StatCard title="Open Rate" value={`${data.overview.openRate}%`} icon={MailOpen} description={`${data.overview.uniqueOpened} unique opens`} />
            <StatCard title="Click Rate" value={`${data.overview.clickRate}%`} icon={MousePointerClick} description={`${data.overview.uniqueClicked} unique clicks`} />
            <StatCard title="Bounce Rate" value={`${data.overview.bounceRate}%`} icon={AlertTriangle} description={`${data.overview.totalBounced} bounced`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Sequences" value={data.overview.sequences.total} icon={Workflow} description={`${data.overview.sequences.active} active`} />
            <StatCard title="Enrolled" value={data.overview.sequences.enrolled} icon={Activity} description="In sequences" />
            <StatCard title="Completed" value={data.overview.sequences.completed} icon={BarChart3} description="Sequences finished" />
            <StatCard title="Verified" value={data.overview.verifiedContacts} icon={ShieldCheck} description={`${data.overview.invalidContacts} invalid`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Email Volume (last 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={data.trend} />
            </CardContent>
          </Card>

          <Tabs defaultValue="sequences">
            <TabsList>
              <TabsTrigger value="sequences">Sequences</TabsTrigger>
              <TabsTrigger value="senders">Sender Health</TabsTrigger>
              <TabsTrigger value="variants">Template A/B</TabsTrigger>
            </TabsList>

            <TabsContent value="sequences">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sequence</TableHead>
                        <TableHead className="text-right">Enrolled</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Opened</TableHead>
                        <TableHead className="text-right">Clicked</TableHead>
                        <TableHead className="text-right">Replied</TableHead>
                        <TableHead className="text-right">Open %</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sequences.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No sequence data yet.</TableCell></TableRow>
                      )}
                      {data.sequences.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{s.name}</p>
                            <Badge variant={s.is_active ? 'default' : 'secondary'} className="mt-1">{s.is_active ? 'Active' : 'Paused'}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{s.enrolled}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.sent}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.opened}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.clicked}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.replied}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.open_rate}%</TableCell>
                          <TableCell className="text-right tabular-nums">{s.completed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="senders">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead className="text-right">Sent (30d)</TableHead>
                        <TableHead className="text-right">Today / Limit</TableHead>
                        <TableHead className="text-right">Open %</TableHead>
                        <TableHead className="text-right">Bounce %</TableHead>
                        <TableHead className="text-right">Complaint %</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.senders.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No sender accounts yet.</TableCell></TableRow>
                      )}
                      {data.senders.map((s) => {
                        const health =
                          s.bounce_rate >= 5 || s.complaint_rate >= 0.3 ? 'destructive' :
                          s.bounce_rate >= 2 ? 'warning' : 'success';
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <p className="text-sm font-medium">{s.email}</p>
                              <p className="text-xs text-muted-foreground">{s.provider.toUpperCase()}</p>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{s.sent_30d}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.sent_today} / {s.daily_send_limit}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.open_rate}%</TableCell>
                            <TableCell className="text-right tabular-nums">{s.bounce_rate}%</TableCell>
                            <TableCell className="text-right tabular-nums">{s.complaint_rate}%</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant={health as any}>{health === 'success' ? 'Healthy' : health === 'warning' ? 'Warning' : 'Unhealthy'}</Badge>
                                <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Paused'}</Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.variants.length === 0 && (
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No template send data yet.</p>
                    </CardContent>
                  </Card>
                )}
                {data.variants.map((v) => (
                  <Card key={v.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm">{v.name}</CardTitle>
                        <Badge variant={v.is_variant ? 'default' : 'outline'}>{v.is_variant ? 'Variant' : 'Base'}</Badge>
                      </div>
                      <CardDescription>{v.sent} sent · {v.usage_count} uses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Open Rate</span>
                            <span className="tabular-nums">{v.open_rate}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(v.open_rate, 100)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Click Rate</span>
                            <span className="tabular-nums">{v.click_rate}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-secondary-foreground" style={{ width: `${Math.min(v.click_rate, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.sent, d.opened, d.clicked]));
  return (
    <div className="space-y-2">
      <div className="flex h-40 w-full items-end gap-2">
        {data.map((d) => (
          <div key={d.date} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-1">
            <div className="w-2 rounded-t-sm bg-primary/40 transition-colors group-hover:bg-primary/60"
              style={{ height: `${(d.opened / max) * 100}%` }} title={`${d.date}: ${d.opened} opened`} />
            <div className="w-2 rounded-t-sm bg-primary transition-colors group-hover:bg-primary/90"
              style={{ height: `${(d.sent / max) * 100}%` }} title={`${d.date}: ${d.sent} sent`} />
          </div>
        ))}
      </div>
      <DetailLegend />
    </div>
  );
}

function DetailLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Sent</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/40" /> Opened</span>
    </div>
  );
}