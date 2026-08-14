'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Send, Users, Plus, Trash2, ListPlus, FilePlus2,
  Workflow, Loader2, Zap, Play, Ban, ChevronDown, X,
  ShieldCheck, Mail as MailIcon, MailOpen, Webhook, ArrowRight
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CsvImportModal } from '@/components/email/csv-import-modal';
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
  run_count: number; template?: { name: string } | null; list?: { name?: string } | null;
}

type NewAction = 
  | { type: 'campaign'; label: 'New Campaign'; href: '/email/campaigns/new' }
  | { type: 'template'; label: 'New Template'; href: '/email/templates/new' }
  | { type: 'sequence'; label: 'New Sequence'; href: '/email/sequences/new' }
  | { type: 'workflow'; label: 'New Workflow'; onClick: () => void }
  | { type: 'list'; label: 'New List'; onClick: () => void }
  | { type: 'contact'; label: 'Import Contacts'; onClick: () => void };

export default function EmailMarketingPage() {
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
  const [showImportContacts, setShowImportContacts] = useState(false);

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
    api<{ data: Contact[] }>(`/api/email/contacts${selectedList ? `?listId=${selectedList}` : ''}`)
      .then((res) => setContacts(res.data))
      .catch(() => setContacts([]));
  }, [selectedList]);

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
      const res = await api<{ data: Contact[] }>(`/api/email/contacts${selectedList ? `?listId=${selectedList}` : ''}`);
      setContacts(res.data);
      setShowImportContacts(false);
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
  const totalContacts = lists.reduce((a, l) => a + (l.contact_count ?? 0), 0);
  const activeWorkflows = workflows.filter((w) => w.is_active).length;
  const openRate = recipients ? `${Math.round((opens / recipients) * 100)}%` : '0%';

  interface NewAction {
  type: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

const newActions: NewAction[] = [
    { type: 'campaign', label: 'New Campaign', href: '/email/campaigns/new' },
    { type: 'template', label: 'New Template', href: '/email/templates/new' },
    { type: 'sequence', label: 'New Sequence', href: '/email/sequences/new' },
    { type: 'workflow', label: 'New Workflow', onClick: () => setShowNewWorkflow(true) },
    { type: 'list', label: 'New List', onClick: () => setShowNewList(true) },
    { type: 'contact', label: 'Import Contacts', onClick: () => setShowImportContacts(true) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Email Marketing" description="Campaigns, audiences and automated follow-ups.">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="gap-2">
              <Plus className="h-4 w-4" /> New
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Create</div>
            <DropdownMenuSeparator />
            {newActions.map((action) => (
              <DropdownMenuItem
                key={action.type}
                onSelect={action.onClick}
                className={action.href ? 'cursor-pointer' : undefined}
                onClick={() => { if (action.href) window.location.href = action.href; }}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Campaigns" value={campaigns.length} icon={Send} description="Total created" />
            <StatCard title="Contacts" value={totalContacts} icon={Users} description="Across all lists" />
            <StatCard title="Recipients" value={recipients} icon={Send} description="Across all campaigns" />
            <StatCard title="Open Rate" value={openRate} icon={Users} description="Average opens" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink href="/email/sequences" icon={Workflow} label="Sequences" description="Multi-step outreach" />
            <QuickLink href="/email/verification" icon={ShieldCheck} label="Verification" description="Clean your lists" />
            <QuickLink href="/email/sender-accounts" icon={MailIcon} label="Sender Accounts" description="SES & Gmail" />
            <QuickLink href="/email/log" icon={MailOpen} label="Email Log" description="Delivery events" />
            <QuickLink href="/email/triggers" icon={Zap} label="Triggers" description="Event automation" />
            <QuickLink href="/email/webhooks" icon={Webhook} label="Webhooks" description="Integrations" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Campaigns</CardTitle>
                  <CardDescription>Create drafts, schedule, and send to your lists.</CardDescription>
                </div>
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
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCampaign(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                      <Button size="sm" type="submit">Create Draft</Button>
                    </div>
                  </form>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Recent Campaigns</h4>
                  <Button variant="outline" size="sm" onClick={() => setShowNewCampaign(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New
                  </Button>
                </div>
                <div className="space-y-2">
                  {campaigns.length ? campaigns.slice(0, 5).map((c) => <CampaignRow key={c.id} campaign={c} onSend={() => sendCampaign(c.id)} />) : (
                    <EmptyState icon={Send} title="No campaigns yet" description="Create your first campaign to start emailing buyers." />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FilePlus2 className="h-4 w-4" /> Templates</CardTitle>
                  <CardDescription>Reusable emails for workflows and campaigns.</CardDescription>
                </div>
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
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTemplate(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                      <Button size="sm" type="submit">Save Template</Button>
                    </div>
                  </form>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Templates</h4>
                  <Button variant="outline" size="sm" onClick={() => setShowNewTemplate(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New
                  </Button>
                </div>
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
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Workflows */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Workflow className="h-4 w-4" /> Workflows</CardTitle>
                  <CardDescription>Automation — new leads, status changes, website inquiries.</CardDescription>
                </div>
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
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewWorkflow(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                      <Button size="sm" type="submit">Create Workflow</Button>
                    </div>
                  </form>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Workflows</h4>
                  <Button variant="outline" size="sm" onClick={() => setShowNewWorkflow(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New
                  </Button>
                </div>
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

            {/* Lists & Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><ListPlus className="h-4 w-4" /> Lists & Contacts</CardTitle>
                  <CardDescription>Manage audiences and import contacts.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Contact Lists</h4>
                    <Button variant="outline" size="sm" onClick={() => setShowNewList(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> New List
                    </Button>
                  </div>
                  {showNewList && (
                    <form onSubmit={createList} className="flex gap-2 mb-4">
                      <Input name="name" placeholder="e.g. US Buyers 2026" required />
                      <Button type="submit" size="sm">Create</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewList(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    </form>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lists.length ? lists.map((l) => (
                      <button key={l.id} type="button" onClick={() => setSelectedList(l.id)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted">
                        <div>
                          <p className="text-sm font-medium">{l.name}</p>
                          {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                        </div>
                        <Badge variant="secondary">{l.contact_count ?? 0} contacts</Badge>
                      </button>
                    )) : <EmptyState icon={Users} title="No lists yet" description="Create a list to start segmenting contacts." />}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Contacts ({contacts.length})</h4>
                      {selectedList && (
                        <Badge variant="outline" onClick={() => setSelectedList('')} className="cursor-pointer gap-1">
                          {lists.find((l) => l.id === selectedList)?.name}
                          <X className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setSelectedList(''); }} />
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowImportContacts(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Import
                    </Button>
                  </div>
                  {showImportContacts && (
                    <CsvImportModal
                      open={showImportContacts}
                      onOpenChange={setShowImportContacts}
                      onImported={() => { setContacts([]); load(); }}
                    />
                  )}
                  <div className="divide-y divide-border rounded-lg border max-h-80 overflow-y-auto">
                    {contacts.length ? contacts.map((c) => (
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
                    )) : <div className="p-8 text-center"><EmptyState icon={Users} title="No contacts" description={selectedList ? "Add contacts to this list." : "Select a list or import contacts."} /></div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

function QuickLink({ href, icon: Icon, label, description }: { href: string; icon: any; label: string; description: string }) {
  return (
    <a href={href} className="group flex items-center gap-3 rounded-lg border border-line bg-card p-4 transition-colors hover:border-primary/40">
      <div className="rounded-md bg-accent-weak p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}