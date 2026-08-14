'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FilePlus2, Plus, Loader2, Trash2, Copy, Library, GitBranch, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Template {
  id: string;
  name: string;
  subject?: string | null;
  body?: string | null;
  body_json?: Record<string, unknown> | null;
  preview_text?: string | null;
  category?: string | null;
  is_variant: boolean;
  parent_template_id?: string | null;
  usage_count?: number;
  updated_at?: string;
}
interface LibraryTemplate {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  subject: string;
}

const CATEGORIES = ['welcome', 'follow_up', 'promotion', 'announcement', 'transactional', 'newsletter'];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<LibraryTemplate[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variants, setVariants] = useState<Record<string, Template[]>>({});
  const [showVariants, setShowVariants] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api<{ data: Template[] }>('/api/email/templates');
      const parents = (res.data ?? []).filter(t => !t.is_variant);
      setTemplates(parents);
      const variantGroups: Record<string, Template[]> = {};
      for (const t of res.data ?? []) {
        if (t.is_variant && t.parent_template_id) {
          variantGroups[t.parent_template_id] = [...(variantGroups[t.parent_template_id] ?? []), t];
        }
      }
      setVariants(variantGroups);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    try {
      await api('/api/email/templates', {
        method: 'POST',
        body: { name: name.trim(), subject: subject.trim(), body: body.trim() }
      });
      toast.success('Template created');
      setShowCreate(false);
      setName(''); setSubject(''); setBody('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await api(`/api/email/templates?id=${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    }
  }

  async function duplicateTemplate(id: string) {
    try {
      const tpl = templates.find(t => t.id === id) ?? variants[showVariants ?? '']?.find(t => t.id === id);
      if (!tpl) return;
      await api('/api/email/templates', {
        method: 'POST',
        body: { name: `${tpl.name} (copy)`, subject: tpl.subject ?? '', body: tpl.body ?? '' }
      });
      toast.success('Template duplicated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  }

  async function openLibrary() {
    setShowLibrary(true);
    setLibraryLoading(true);
    try {
      const res = await api<{ data: LibraryTemplate[] }>('/api/email/templates/library');
      setLibrary(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLibraryLoading(false);
    }
  }

  async function createFromLibrary(slug: string) {
    try {
      await api('/api/email/templates/library', {
        method: 'POST',
        body: { action: 'create-from-library', slug }
      });
      toast.success('Template created from library');
      setShowLibrary(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create from library');
    }
  }

  async function createVariant(parentId: string) {
    const name = prompt('Variant name:');
    if (!name?.trim()) return;
    const subject = prompt('Variant subject line (optional):');
    try {
      await api('/api/email/templates/variants', {
        method: 'POST',
        body: {
          action: 'create-variant',
          parentTemplateId: parentId,
          input: { name: name.trim(), subject_text: subject?.trim() || undefined }
        }
      });
      toast.success('Variant created');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create variant');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Reusable emails with A/B variants for campaigns and sequences.">
        <Button variant="outline" onClick={openLibrary} className="gap-2">
          <Library className="h-4 w-4" /> Library
        </Button>
        <Button onClick={() => setShowCreate(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </PageHeader>

      {showCreate && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createTemplate} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Template Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Buyer welcome" required />
                </div>
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Thank you for your inquiry {{name}}" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Body</Label>
                <textarea
                  className="min-h-32 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={'Hello {{name}},\n\nYour body with {{company}}, {{country}} tags...'}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm">Save Template</Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No templates yet. Create one or start from the library.</p>
              </CardContent>
            </Card>
          )}
          {templates.map(t => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline">{t.category ?? 'general'}</Badge>
                </div>
                <CardDescription className="line-clamp-1">{t.subject}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.body && <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{t.body}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowVariants(showVariants === t.id ? null : t.id)}>
                    <GitBranch className="mr-1 h-3.5 w-3.5" /> Variants ({variants[t.id]?.length ?? 0})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createVariant(t.id)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Variant
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicateTemplate(t.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {showVariants === t.id && variants[t.id]?.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    {variants[t.id].map(v => (
                      <div key={v.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{v.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{v.subject}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteTemplate(v.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>Prebuilt outreach templates. Click one to add it to your templates.</DialogDescription>
          </DialogHeader>
          {libraryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {library.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Library is empty. Templates will appear here once seeded.
                </p>
              )}
              {library.map(t => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => createFromLibrary(t.slug)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t.name}</p>
                      <Badge variant="outline">{t.category ?? 'general'}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.subject}</p>
                    {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}