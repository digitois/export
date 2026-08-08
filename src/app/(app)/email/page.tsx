'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Send, Users, Plus, Trash2, ListPlus, FilePlus2,
  Workflow, Loader2, Zap, Play, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface List { id: string; name: string; description?: string | null; contact_count?: number; }
interface Contact { id: string; email: string; name?: string | null; country?: string | null; unsubscribed?: boolean; }
interface Template { id: string; name: string; subject: string; body: string; }
interface Campaign {
  id: string; name: string; subject: string; status: string;
  recipients_count?: number; opened_count?: number;
  created_at?: string; list?: { name?: string } | null;
}
interface Workflow {
  id: string; name: string; trigger_type: string; is_active: boolean;
  run_count: number; template?: { name: string } | null; list?: { name: string } | null;
}

type ActiveTab = 'overview' | 'campaigns' | 'lists' | 'contacts' | 'templates' | 'workflows';

export default function EmailMarketingPage() {
  const [tab, setTab] = useState<ActiveTab>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedList, setSelectedList] = useState('');
  const [loading, setLoading] = useState(true);

  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);

  async function load() {
    try {
      const [c, l, t, wf] = await Promise.all([
        api<{ data: Campaign[] }>('/api/email/campaigns'),
        api<{ data: List[] }>('/api/email/lists'),
        api<{ data: Template[] }>('/api/email/templates'),
        api<{ data: { workflows: Workflow[] } }>('/api/email/workflows')
      ]);
      setCampaigns(c.data);
      setLists(l.data);
      setTemplates(t.data);
      setWorkflows(wf.data.workflows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== 'contacts') return;
    api<{ data: Contact[] }>(`/api/email/contacts${selectedList ? `?listId=${selectedList}` : ''}`)
      .then((res) => setContacts(res.data))
      .catch(() => setContacts([]));
  }, [tab, selectedList]);

  async function createList(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api('/api/email/lists', { method: 'POST', body: { name: String(fd.get('name')) } });
      toast.success('List created');
      setShowNewList(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create list');
    }
  }

  async function createTemplate(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api('/api/email/templates', {
        method: 'POST',
        body: {
          name: String(fd.get('name')),
          subject: String(fd.get('subject')),
          body: String(fd.get('body'))
        }
      });
      toast.success('Template saved');
      setShowNewTemplate(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    }
  }

  async function createWorkflow(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api('/api/email/workflows', {
        method: 'POST',
        body: {
          name: String(fd.get('name')),
          triggerType: String(fd.get('triggerType')),
          templateId: (fd.get('template') as string) || null,
          listId: (fd.get('list') as string) || null,
          isActive: true
        }
      });
      toast.success('Workflow created');
      setShowNewWorkflow(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  }

  async function createCampaign(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api('/api/email/campaigns', {
        method: 'POST',
        body: {
          name: String(fd.get('name')),
          subject: String(fd.get('subject')),
          body: String(fd.get('body')),
          listId: (fd.get('list') as string) || null,
          templateId: (fd.get('template') as string) || null
        }
      });
      toast.success('Campaign draft created');
      setShowNewCampaign(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  }

  async function sendCampaign(id: string) {
    try {
      const res = await api<{ data: { sent: number } }>('/api/email/campaigns', {
        method: 'PATCH',
        body: { id, action: 'send' }
      });
      toast.success(`Campaign sent to ${res.data.sent} contacts`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send campaign');
    }
  }

  async function addContacts(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const input = String(fd.get('emails') ?? '');
    const emails = input.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) return;
    try {
      await api('/api/email/contacts', {
        method: 'POST',
        body: emails.map((email) => ({ listId: selectedList || null, email }))
      });
      toast.success(`${emails.length} contacts added`);
      if (tab === 'contacts') {
        const res = await api<{ data: Contact[] }>(`/api/email/contacts${selectedList ? `?listId=${selectedList}` : ''}`);
        setContacts(res.data);
      }
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contacts');
    }
  }

  async function deleteWorkflow(id: string) {
    try {
      await api(`/api/email/workflows?id=${id}`, { method: 'DELETE' });
      toast.success('Workflow deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  }

  const recipients = campaigns.reduce((acc, c) => acc + (c.recipients_count ?? 0), 0);
  const opens = campaigns.reduce((acc, c) => acc + (c.opened_count ?? 0), 0);
  const activeWorkflows = workflows.filter((w) => w.is_active).length;
  const openRate = recipients ? `${Math.round((opens / recipients) * 100)}%` : '0%';

  return (
    <div className="space-y-6">
      <PageHeader title="Email Marketing" description="Campaigns, audiences and automated follow-ups." />

      <div className="flex flex-wrap gap-2">
        {(['overview', 'campaigns', 'templates', 'lists', 'contacts', 'workflows'] as const).map((t) => (
          <Badge key={t} variant={tab === t ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => setTab(t)}>
            {t}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Campaigns" value={campaigns.length} icon={Send} description="Total created" />
                <StatCard title="Contacts" value={contacts.length || lists.reduce((a, l) => a + (l.contact_count ?? 0), 0)} icon={Users} description="Across all lists" />
                <StatCard title="Recipients" value={recipients} icon={Send} description="Across all campaigns" />
                <StatCard title="Open Rate" value={openRate} icon={Users} description="Average opens" />
              </div>

              <div className="space-y-3">
                {campaigns.length ? (
                  campaigns.slice(0, 5).map((c) => <CampaignRow key={c.id} campaign={c} onSend={() => sendCampaign(c.id)} />)
                ) : (
                  <EmptyState icon={Send} title="No campaigns yet" description="Create your first campaign to start emailing buyers." />
                )}
              </div>
            </div>
          )}

          {tab === 'campaigns' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Campaigns</CardTitle>
                  <CardDescription>Create drafts, schedule, and send to your lists.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowNewCampaign((v) => !v)}>
                  {showNewCampaign ? <Ban className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {showNewCampaign ? 'Cancel' : 'New Campaign'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewCampaign && (
                  <form onSubmit={createCampaign} className="grid gap-4 rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field name="name" label="Campaign Name" placeholder="March Buyer Newsletter" required />
                      <Field name="subject" label="Subject" placeholder="Fresh shipment just landed" required />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField name="list" label="Send To (List)" options={lists.map((l) => ({ value: l.id, label: l.name }))} placeholder="All contacts (no list)" />
                      <SelectField name="template" label="Start From Template" options={templates.map((t) => ({ value: t.id, label: t.name }))} placeholder="None" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email Body</Label>
                      <Textarea name="body" rows={6} required placeholder={'Hello {{name}},\n\nYour body...'} />
                    </div>
                    <div className="flex justify-end"><Button size="sm" type="submit">Create Draft</Button></div>
                  </form>
                )}
                <div className="space-y-2">
                  {campaigns.length ? campaigns.map((c) => <CampaignRow key={c.id} campaign={c} onSend={() => sendCampaign(c.id)} />) : (
                    <EmptyState icon={Send} title="No campaigns" description="Create your first campaign above." />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'templates' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>Reusable emails for workflows and campaigns.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowNewTemplate((v) => !v)}>
                  {showNewTemplate ? <Ban className="mr-2 h-4 w-4" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                  {showNewTemplate ? 'Cancel' : 'New Template'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewTemplate && (
                  <form onSubmit={createTemplate} className="grid gap-4 rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field name="t-name" label="Template Name" placeholder="Buyer Welcome" required />
                      <Field name="subject" label="Subject" placeholder="Thank you for your inquiry {{name}}" required />
                    </div>
                    <div className="space-y-1">
                      <Label>Body</Label>
                      <Textarea name="body" rows={6} required placeholder={'Available tags: {{name}}, {{email}}, {{company}}, {{country}}'} />
                    </div>
                    <div className="flex justify-end"><Button size="sm" type="submit">Save Template</Button></div>
                  </form>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.length ? templates.map((t) => (
                    <div key={t.id} className="rounded-lg border p-4">
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Subject: {t.subject}</p>
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{t.body}</p>
                    </div>
                  )) : <div className="md:col-span-2"><EmptyState icon={FilePlus2} title="No templates" description="Create templates to reuse in workflows." /></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'lists' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contact Lists</CardTitle>
                    <CardDescription>Audiences for campaigns.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowNewList((v) => !v)}>
                    {showNewList ? <Ban className="mr-2 h-4 w-4" /> : <ListPlus className="mr-2 h-4 w-4" />}
                    {showNewList ? 'Cancel' : 'New List'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showNewList && (
                    <form onSubmit={createList} className="flex gap-2">
                      <Input name="name" placeholder="e.g. US Buyers 2026" required />
                      <Button type="submit" size="sm">Create</Button>
                    </form>
                  )}
                  {lists.length ? lists.map((l) => (
                    <button key={l.id} type="button" onClick={() => { setSelectedList(l.id); setTab('contacts'); }} className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted">
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                      </div>
                      <Badge variant="secondary">{l.contact_count ?? 0} contacts</Badge>
                    </button>
                  )) : <EmptyState icon={Users} title="No lists yet" description="Create a list to start segmenting contacts." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Contacts</CardTitle>
                  <CardDescription>Paste emails (one per line) to add to the selected list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedList} onValueChange={setSelectedList}>
                    <SelectTrigger><SelectValue placeholder="Select a list (optional)" /></SelectTrigger>
                    <SelectContent>
                      {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <form onSubmit={addContacts} className="space-y-2">
                    <Textarea name="emails" rows={6} placeholder={'buyer@example.com\nanother@buyer.com'} />
                    <Button type="submit" size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Add Contacts</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'contacts' && (
            <Card>
              <CardHeader>
                <CardTitle>Contacts ({contacts.length})</CardTitle>
                <CardDescription>Everyone in your email lists.</CardDescription>
              </CardHeader>
              <CardContent>
                {contacts.length ? (
                  <div className="divide-y divide-border rounded-lg border">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{c.name || c.email}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.country && <Badge variant="outline">{c.country}</Badge>}
                          {c.unsubscribed && <Badge variant="secondary">Unsubscribed</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={Users} title="No contacts" description="Add contacts from the Lists tab." />}
              </CardContent>
            </Card>
          )}

          {tab === 'workflows' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Workflow className="h-4 w-4" /> Workflows</CardTitle>
                  <CardDescription>Automation — new leads, status changes, website inquiries.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowNewWorkflow((v) => !v)}>
                  {showNewWorkflow ? <Ban className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {showNewWorkflow ? 'Cancel' : 'New Workflow'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewWorkflow && (
                  <form onSubmit={createWorkflow} className="grid gap-4 rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field name="3-name" label="Workflow Name" placeholder="Welcome new buyer" required />
                      <SelectField name="triggerType" label="Trigger" options={TRIGGERS.map((t) => ({ value: t.value, label: t.label }))} placeholder="Select trigger" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField name="template" label="Send Email Template (optional)" options={templates.map((t) => ({ value: t.id, label: t.name }))} placeholder="No email" />
                      <SelectField name="list" label="Add to List (optional)" options={lists.map((l) => ({ value: l.id, label: l.name }))} placeholder="No list" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When the trigger fires we add this buyer to the list and/or email them the template, automatically.
                    </p>
                    <div className="flex justify-end"><Button size="sm" type="submit">Create Workflow</Button></div>
                  </form>
                )}

                <div className="space-y-3">
                  {workflows.length ? workflows.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-primary/10 p-2 text-primary"><Zap className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTrigger(w.trigger_type)} · {w.run_count} runs{w.template?.name ? ` · sends "${w.template.name}"` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={w.is_active ? 'default' : 'secondary'}>{w.is_active ? 'Active' : 'Paused'}</Badge>
                        <Button size="sm" variant="outline" onClick={() => deleteWorkflow(w.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )) : <EmptyState icon={Workflow} title="No workflows" description="Automate follow-ups triggered by lead activity." />}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Field({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} required={required} />
    </div>
  );
}

function SelectField({ name, label, options, placeholder }: { name: string; label: string; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`sel-${name}`}>{label}</Label>
      <Select name={name} defaultValue="">
        <SelectTrigger id={`sel-${name}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function CampaignRow({ campaign, onSend }: { campaign: Campaign; onSend: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{campaign.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {campaign.subject} · {campaign.list?.name ?? 'all contacts'} · {formatDate(campaign.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline">{campaign.status}</Badge>
        {campaign.status === 'draft' && (
          <Button size="sm" variant="outline" onClick={onSend}>
            <Play className="mr-1 h-3.5 w-3.5" /> Send
          </Button>
        )}
      </div>
    </div>
  );
}

const TRIGGERS = [
  { value: 'lead_created', label: 'New lead created' },
  { value: 'lead_status_changed', label: 'Lead status changed' },
  { value: 'inquiry_received', label: 'Website inquiry received' }
];

function formatTrigger(t: string) {
  return TRIGGERS.find((x) => x.value === t)?.label ?? t;
}