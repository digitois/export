'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, MailOpen, MousePointerClick, AlertTriangle, EyeOff, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface ActivityRow {
  id: string;
  event: string;
  email: string;
  click_url?: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at: string;
  email_templates?: { name?: string } | { name?: string }[] | null;
  email_campaigns?: { name?: string } | null;
}
interface ActivityStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

const EVENTS = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'];

export default function EmailLogPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [eventFilter, setEventFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const query = eventFilter !== 'all' ? `?event=${eventFilter}` : '';
      const [logRes, statsRes] = await Promise.all([
        api<{ data: { items: ActivityRow[]; count: number } }>(`/api/email/activity${query}`),
        api<{ data: ActivityStats }>('/api/email/activity?scope=stats')
      ]);
      setRows(logRes.data.items);

      setStats(statsRes.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [eventFilter]);

  const eventIcon = (ev: string) => {
    switch (ev) {
      case 'opened': return <MailOpen className="h-3.5 w-3.5" />;
      case 'clicked': return <MousePointerClick className="h-3.5 w-3.5" />;
      case 'bounced': case 'complained': return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'unsubscribed': return <Ban className="h-3.5 w-3.5" />;
      default: return <Mail className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Email Log" description="Delivery events across all your campaigns and sequences." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Sent" value={stats?.sent ?? 0} icon={Mail} description="Emails sent" />
            <StatCard title="Opened" value={stats?.opened ?? 0} icon={MailOpen} description={`${stats?.openRate ?? 0}% open rate`} />
            <StatCard title="Clicked" value={stats?.clicked ?? 0} icon={MousePointerClick} description={`${stats?.clickRate ?? 0}% click rate`} />
            <StatCard title="Bounced" value={stats?.bounced ?? 0} icon={AlertTriangle} description="Hard + soft bounces" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Recent events across all email channels.</CardDescription>
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All events" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {EVENTS.map(ev => <SelectItem key={ev} value={ev}>{ev}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Campaign / Template</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No activity yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map(row => {
                    const tpl = Array.isArray(row.email_templates) ? row.email_templates[0]?.name : row.email_templates?.name;
                    const cmp = row.email_campaigns?.name;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 capitalize">
                            {eventIcon(row.event)} {row.event}
                          </Badge>
                          {row.click_url && (
                            <p className="mt-1 max-w-[240px] truncate font-mono text-xs text-muted-foreground">{row.click_url}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{row.email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">
                            {cmp ? `Campaign: ${cmp}` : ''}
                            {tpl ? `${cmp ? ' · ' : ''}${tpl}` : ''}
                            {!cmp && !tpl ? '—' : ''}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(row.occurred_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}