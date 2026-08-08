'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LEAD_STATUSES } from '@/lib/constants';

interface LeadActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_id?: { full_name?: string; email?: string } | null;
}

interface LeadLocal {
  companyName: string;
  buyerName: string;
  email: string;
  phone: string;
  country: string;
  productInterested: string;
  leadValue: number | null;
  currency: string;
  source: string;
  priority: string;
  status: string;
  notes: string;
}

interface LeadDetail {
  id: string;
  buyer_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  product_interested?: string | null;
  lead_value?: number | null;
  currency?: string;
  source?: string;
  priority?: string;
  status?: string;
  notes?: string | null;
  activities?: LeadActivity[];
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadLocal | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState('note');

  useEffect(() => {
    params.then((p) => setId(p.id)).catch(() => null);
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api<{ data: LeadDetail }>(`/api/leads/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setLead({
          companyName: d.company_name ?? '',
          buyerName: d.buyer_name ?? '',
          email: d.email ?? '',
          phone: d.phone ?? '',
          country: d.country ?? '',
          productInterested: d.product_interested ?? '',
          leadValue: d.lead_value != null ? Number(d.lead_value) : null,
          currency: d.currency ?? 'USD',
          source: d.source ?? 'manual',
          priority: d.priority ?? 'medium',
          status: d.status ?? 'new',
          notes: d.notes ?? ''
        });
        setActivities(d.activities ?? []);
      })
      .catch((err) => setLead(null))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <Loading />;
  if (loading) return <Loading label="Loading lead..." />;
  if (!lead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lead not found" />
        <Button asChild variant="outline"><Link href="/leads"><ArrowLeft className="h-4 w-4" /> Back to leads</Link></Button>
      </div>
    );
  }

  async function saveLead() {
    setSaving(true);
    try {
      await api(`/api/leads/${id}`, { method: 'PATCH', body: lead });
      toast('Lead updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    try {
      await api(`/api/leads/${id}`, { method: 'PATCH', body: { status } });
      setLead((prev) => prev ? { ...prev, status } : prev);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    try {
      const res = await api<{ data: LeadActivity }>('/api/leads/activities', {
        method: 'POST',
        body: { leadId: id, type: newNoteType, description: newNote }
      });
      setActivities((prev) => [res.data, ...prev]);
      setNewNote('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add note');
    }
  }

  async function deleteLead() {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/api/leads/${id}`, { method: 'DELETE' });
      toast.success('Lead deleted');
      router.push('/leads');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.buyerName}
        description={lead.companyName || 'Lead'}
      >
        <Button asChild variant="outline"><Link href="/leads"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Button variant="destructive" disabled={deleting} onClick={deleteLead}>
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
        </Button>
        <Button onClick={saveLead} disabled={saving}>
          {saving ? <Spinner /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </PageHeader>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Details</CardTitle>
            <CardDescription>Edit the buyer information below.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Buyer Name</Label>
              <Input value={lead.buyerName} onChange={(e) => setLead({ ...lead, buyerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={lead.companyName ?? ''} onChange={(e) => setLead({ ...lead, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={lead.email ?? ''} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={lead.phone ?? ''} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={lead.country ?? ''} onChange={(e) => setLead({ ...lead, country: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Product Interested</Label>
              <Input value={lead.productInterested ?? ''} onChange={(e) => setLead({ ...lead, productInterested: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Lead Value</Label>
              <Input
                type="number"
                min={0}
                value={lead.leadValue ?? ''}
                onChange={(e) => setLead({ ...lead, leadValue: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input maxLength={3} value={lead.currency ?? 'USD'} onChange={(e) => setLead({ ...lead, currency: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={lead.source} onChange={(e) => setLead({ ...lead, source: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={lead.priority} onValueChange={(v) => setLead({ ...lead, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={4} value={lead.notes ?? ''} onChange={(e) => setLead({ ...lead, notes: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Status</CardTitle>
            <CardDescription>Move this lead through your sales pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {LEAD_STATUSES.map((s) => (
                <Button
                  key={s.value}
                  variant={lead.status === s.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeStatus(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activities & Notes</CardTitle>
            <CardDescription>Log calls, emails, meetings and follow-ups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={newNoteType} onValueChange={setNewNoteType}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Add an activity or note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
              <Button onClick={addNote}><Plus className="h-4 w-4" /> Add</Button>
            </div>
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li key={activity.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{activity.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(activity.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="mt-1 text-sm">{activity.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}