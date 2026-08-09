'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { BLOCK_META, createBlock, isSiteBlockType, type SiteBlock, type SiteBlockType } from '@/lib/site/blocks';
import { getSiteTheme, SITE_THEME_LIST, type ThemeId } from '@/lib/site/themes';
import { instantiateTemplate, industryLabel, type SiteTemplate } from '@/lib/site/templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BlockPreview } from '@/components/website-builder/block-preview';
import { Inspector, cloneValue } from '@/components/website-builder/inspector';
import { Palette } from '@/components/website-builder/palette';
import { TemplateGallery } from '@/components/website-builder/template-gallery';

interface Settings {
  theme?: ThemeId;
  primaryColor?: string;
  accentColor?: string;
  heroHeading?: string | null;
  heroSubheading?: string | null;
  heroEyebrow?: string | null;
  heroImageUrl?: string | null;
  announcementBar?: string | null;
  ctaLabel?: string | null;
  showInquiryForm?: boolean;
  enableProductSection?: boolean;
  enableAboutSection?: boolean;
  enableBlogSection?: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  customFooter?: string | null;
  isPublished?: boolean;
  industry?: string | null;
  templateId?: string | null;
  blocks?: SiteBlock[];
}

const AUTOSAVE_DELAY = 1500;

export default function WebsiteBuilderPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [websiteSubdomain, setWebsiteSubdomain] = useState('');
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  const dragDepth = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<{ settings: Settings | null; blocks: SiteBlock[] }>({ settings: null, blocks: [] });

  useEffect(() => {
    latestRef.current = { settings, blocks };
  }, [settings, blocks]);

  useEffect(() => {
    api<{ data: Settings }>('/api/website/settings')
      .then((res) => {
        const data = res.data;
        setSettings(data);
        setWebsiteSubdomain(String((data as unknown as { websiteSubdomain?: string }).websiteSubdomain ?? ''));
        const loaded = Array.isArray(data.blocks) ? (data.blocks as SiteBlock[]) : [];
        setBlocks(loaded);
        // First-time users (no blocks, no template chosen) start at the gallery.
        if (loaded.length === 0 && !data.templateId) setShowGallery(true);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load website settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const clear = () => {
      setDropIndex(null);
      dragDepth.current = 0;
    };
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const theme = useMemo(() => getSiteTheme(settings?.theme), [settings?.theme]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const siteUrl = websiteSubdomain ? `/s/${websiteSubdomain}` : null;
  const vars = {
    '--site-primary': settings?.primaryColor || '#0f172a',
    '--site-accent': settings?.accentColor || '#0284c7'
  } as CSSProperties;

  function markChanged() {
    setDirty(true);
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist();
    }, AUTOSAVE_DELAY);
  }

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    markChanged();
  }

  function insertBlock(type: SiteBlockType, index?: number) {
    const block = createBlock(type);
    setBlocks((prev) => {
      const next = prev.slice();
      next.splice(index ?? next.length, 0, block);
      return next;
    });
    setSelectedId(block.id);
    markChanged();
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    markChanged();
  }

  function duplicateBlock(id: string) {
    let created = false;
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) return prev;
      const copy: SiteBlock = {
        ...cloneValue(prev[i]),
        id: crypto.randomUUID()
      };
      const next = prev.slice();
      next.splice(i + 1, 0, copy);
      created = true;
      return next;
    });
    markChanged();
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    markChanged();
  }

  function reorderBlock(id: string, target: number) {
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === id);
      if (from < 0) return prev;
      const block = prev[from];
      const rest = prev.filter((b) => b.id !== id);
      let t = from < target ? target - 1 : target;
      t = Math.max(0, Math.min(t, rest.length));
      const next = rest.slice();
      next.splice(t, 0, block);
      return next;
    });
    markChanged();
  }

  function updateBlockProps(id: string, props: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props } : b)));
    markChanged();
  }

  async function applyTemplate(template: SiteTemplate) {
    const seed = instantiateTemplate(template);
    setApplyingTemplate(template.id);
    const nextSettings: Settings | null = settings
      ? { ...settings, theme: seed.theme, primaryColor: seed.primaryColor, accentColor: seed.accentColor, industry: seed.industry, templateId: seed.templateId }
      : settings;
    const payload = {
      theme: seed.theme,
      primaryColor: seed.primaryColor,
      accentColor: seed.accentColor,
      heroHeading: settings?.heroHeading ?? null,
      heroSubheading: settings?.heroSubheading ?? null,
      heroEyebrow: settings?.heroEyebrow ?? null,
      heroImageUrl: settings?.heroImageUrl ?? '',
      announcementBar: settings?.announcementBar ?? null,
      ctaLabel: settings?.ctaLabel ?? null,
      enableProductSection: settings?.enableProductSection ?? true,
      enableAboutSection: settings?.enableAboutSection ?? true,
      enableBlogSection: settings?.enableBlogSection ?? true,
      showInquiryForm: settings?.showInquiryForm ?? true,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      whatsappNumber: settings?.whatsappNumber ?? null,
      customFooter: settings?.customFooter ?? null,
      industry: seed.industry,
      templateId: seed.templateId,
      blocks: seed.blocks
    };
    try {
      await api('/api/website/settings', { method: 'PUT', body: payload });
      setSettings(nextSettings);
      setBlocks(seed.blocks);
      setSelectedId(null);
      setShowGallery(false);
      setSaveState('saved');
      setDirty(false);
      toast.success(`Applied “${template.name}” — now customize it`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplyingTemplate(null);
    }
  }

  function startBlank() {
    setShowGallery(false);
    setSettings((prev) => (prev ? { ...prev, templateId: prev.templateId ?? 'blank' } : prev));
    markChanged();
  }

  async function persist(): Promise<{ ok: boolean; error?: string }> {
    const current = latestRef.current;
    if (!current.settings) return { ok: false, error: 'Settings not loaded yet' };
    setSaveState('saving');
    const payload = {
      theme: current.settings.theme,
      primaryColor: current.settings.primaryColor,
      accentColor: current.settings.accentColor,
      heroHeading: current.settings.heroHeading ?? null,
      heroSubheading: current.settings.heroSubheading ?? null,
      heroEyebrow: current.settings.heroEyebrow ?? null,
      heroImageUrl: current.settings.heroImageUrl ?? '',
      announcementBar: current.settings.announcementBar ?? null,
      ctaLabel: current.settings.ctaLabel ?? null,
      enableProductSection: current.settings.enableProductSection ?? true,
      enableAboutSection: current.settings.enableAboutSection ?? true,
      enableBlogSection: current.settings.enableBlogSection ?? true,
      showInquiryForm: current.settings.showInquiryForm ?? true,
      contactEmail: current.settings.contactEmail ?? null,
      contactPhone: current.settings.contactPhone ?? null,
      whatsappNumber: current.settings.whatsappNumber ?? null,
      customFooter: current.settings.customFooter ?? null,
      industry: current.settings.industry ?? null,
      templateId: current.settings.templateId ?? null,
      blocks: current.blocks
    };
    try {
      await api('/api/website/settings', { method: 'PUT', body: payload });
      setSaveState('saved');
      setDirty(false);
      return { ok: true };
    } catch (err) {
      setSaveState('error');
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to save changes' };
    }
  }

  async function save() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const res = await persist();
    if (res.ok) toast.success('Website settings saved');
    else toast.error(res.error ?? 'Failed to save');
  }

  async function togglePublish() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = !latestRef.current.settings?.isPublished;
    setPublishing(true);
    try {
      const res = await persist();
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to save changes');
        return;
      }
      await api('/api/website/settings', { method: 'POST', body: { isPublished: next } });
      setSettings((prev) => (prev ? { ...prev, isPublished: next } : prev));
      setSaveState('saved');
      setDirty(false);
      toast.success(next ? 'Website published' : 'Website unpublished');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update publish state');
    } finally {
      setPublishing(false);
    }
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current += 1;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!Array.from(e.dataTransfer.types).includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.dropEffect === 'copy' ? 'copy' : 'move';
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-block-card]') as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const idx = Number(el.dataset.blockIndex ?? 0);
      setDropIndex(before ? idx : idx + 1);
    } else {
      setDropIndex(blocks.length);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDropIndex(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    const raw = e.dataTransfer.getData('text/plain');
    const target = dropIndex;
    setDropIndex(null);
    if (!raw) return;
    if (isSiteBlockType(raw)) {
      insertBlock(raw, target ?? undefined);
    } else if (blocks.some((b) => b.id === raw)) {
      reorderBlock(raw, target ?? blocks.length);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showGallery) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Website Builder</h1>
            <p className="text-sm text-muted-foreground">Start from an industry-ready design, then customize every part.</p>
          </div>
          {blocks.length > 0 && (
            <Button variant="ghost" onClick={() => setShowGallery(false)}>
              Back to editor
            </Button>
          )}
        </div>
        <TemplateGallery onUse={applyTemplate} onStartBlank={startBlank} busyTemplateId={applyingTemplate} />
      </div>
    );
  }

  const guide = (i: number) =>
    dropIndex === i ? <div className="h-1 rounded-full bg-blue-600 shadow-sm" /> : null;

  return (
    <div className="space-y-4" style={vars}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Website Builder</h1>
            <p className="text-sm text-muted-foreground">Drag sections onto the canvas, then customize each block.</p>
          </div>
          {settings && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {theme.name} theme
            </span>
          )}
          {settings?.industry && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
              {industryLabel(settings.industry)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!settings?.isPublished && dirty ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" /> Unsaved changes
            </span>
          ) : !dirty && saveState === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {saveState === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {saveState === 'saving' ? 'Saving…' : 'Up to date'}
            </span>
          )}
          {siteUrl && (
            <Button variant="outline" asChild>
              <Link href={siteUrl} target="_blank">
                <ExternalLink className="h-4 w-4" /> View site
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowGallery(true)}>
            <LayoutTemplate className="h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" onClick={() => setPreviewMode((p) => !p)}>
            <Eye className="h-4 w-4" /> {previewMode ? 'Exit preview' : 'Preview'}
          </Button>
          <Button onClick={save} disabled={saveState === 'saving' || !settings}>
            {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button variant="secondary" onClick={togglePublish} disabled={publishing || !settings}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : settings?.isPublished ? <CheckCircle2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {settings?.isPublished ? 'Published' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        <div className="rounded-lg border bg-muted/50 p-4 sm:p-6">
          <div className="mx-auto max-w-[900px] space-y-6 rounded-lg border bg-background p-6 shadow-sm">
            {blocks.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Nothing to preview yet</p>
                <p className="mt-1">Exit preview mode and add your first section.</p>
              </div>
            ) : (
              blocks.map((b) => <BlockPreview key={b.id} block={b} />)
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Palette onAdd={(type) => insertBlock(type)} />
          </div>

          <div
            className="min-h-[60vh] rounded-lg border bg-muted/40"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mx-auto max-w-[900px] space-y-4 px-4 py-6">
              {blocks.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-background p-12 text-center">
                  <LayoutTemplate className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">Your page is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drag sections from the left palette, or start from a ready-made industry template.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button onClick={() => setShowGallery(true)}>
                      <LayoutTemplate className="h-4 w-4" /> Browse templates
                    </Button>
                    <Button variant="outline" onClick={() => insertBlock('hero')}>
                      <Plus className="h-4 w-4" /> Add a section
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {blocks.map((b, i) => (
                    <Fragment key={b.id}>
                      {guide(i)}
                      <CanvasItem
                        block={b}
                        index={i}
                        total={blocks.length}
                        selected={b.id === selectedId}
                        onSelect={() => setSelectedId(b.id)}
                        onMoveUp={() => moveBlock(b.id, -1)}
                        onMoveDown={() => moveBlock(b.id, 1)}
                        onDuplicate={() => duplicateBlock(b.id)}
                        onDelete={() => removeBlock(b.id)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', b.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDropIndex(null)}
                      />
                    </Fragment>
                  ))}
                  {guide(blocks.length)}
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {selectedBlock ? (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <Inspector
                  block={selectedBlock}
                  onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                  onDelete={() => removeBlock(selectedBlock.id)}
                />
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
                Select a section on the canvas to edit its content and layout.
              </div>
            )}

            <SiteSettingsCard settings={settings} onChange={updateSettings} />
          </div>
        </div>
      )}
    </div>
  );
}

interface CanvasItemProps {
  block: SiteBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function CanvasItem({ block, index, total, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, onDragStart, onDragEnd }: CanvasItemProps) {
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;
  return (
    <div
      data-block-card
      data-block-index={index}
      onClick={onSelect}
      className={cn(
        'group rounded-lg border bg-background shadow-sm transition-all',
        selected ? 'ring-2 ring-primary' : 'hover:border-primary/40'
      )}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex cursor-grab select-none items-center gap-2 rounded-t-lg border-b bg-muted/40 px-3 py-1.5 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium">{meta.label}</span>
        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton disabled={index === 0} title="Move up" onClick={onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton disabled={index === total - 1} title="Move down" onClick={onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Duplicate" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Delete" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </span>
      </div>
      <div className="pointer-events-none p-3 sm:p-4">
        <BlockPreview block={block} />
      </div>
    </div>
  );
}

function IconButton({ children, onClick, disabled, title, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30', className)}
    >
      {children}
    </button>
  );
}

function SiteSettingsCard({ settings, onChange }: { settings: Settings | null; onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>Theme and legacy settings apply across the site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-2 gap-2">
            {SITE_THEME_LIST.map((t) => {
              const active = (settings?.theme ?? 'modern') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange('theme', t.id)}
                  title={t.description}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 text-left transition-colors',
                    active ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40'
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: t.hero.bg }}>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.hero.accent }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{t.name}</span>
                  </span>
                  {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="builderPrimaryColor">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="builderPrimaryColor"
                type="color"
                value={settings?.primaryColor ?? '#0f172a'}
                onChange={(e) => onChange('primaryColor', e.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded border bg-transparent p-1"
              />
              <Input value={settings?.primaryColor ?? ''} onChange={(e) => onChange('primaryColor', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                id="accentColor"
                type="color"
                value={settings?.accentColor ?? '#0284c7'}
                onChange={(e) => onChange('accentColor', e.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded border bg-background p-1"
              />
              <Input value={settings?.accentColor ?? ''} onChange={(e) => onChange('accentColor', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hero & content</p>
          <div className="space-y-2">
            <Label htmlFor="heroEyebrow">Eyebrow</Label>
            <Input id="heroEyebrow" value={settings?.heroEyebrow ?? ''} onChange={(e) => onChange('heroEyebrow', e.target.value)} placeholder="e.g. Premium Spices Since 1998" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroHeading">Hero heading</Label>
            <Input id="heroHeading" value={settings?.heroHeading ?? ''} onChange={(e) => onChange('heroHeading', e.target.value)} placeholder="e.g. Premium Organic Spices" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubheading">Subheading</Label>
            <Textarea id="heroSubheading" rows={2} value={settings?.heroSubheading ?? ''} onChange={(e) => onChange('heroSubheading', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctaLabel">CTA button text</Label>
            <Input id="ctaLabel" value={settings?.ctaLabel ?? ''} onChange={(e) => onChange('ctaLabel', e.target.value)} placeholder="Request a Quote" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcementBar">Announcement bar</Label>
            <Input id="announcementBar" value={settings?.announcementBar ?? ''} onChange={(e) => onChange('announcementBar', e.target.value)} placeholder="e.g. Worldwide shipping available" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroImageUrl">Hero background image URL</Label>
            <Input id="heroImageUrl" value={settings?.heroImageUrl ?? ''} onChange={(e) => onChange('heroImageUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customFooter">Custom footer text</Label>
            <Input id="customFooter" value={settings?.customFooter ?? ''} onChange={(e) => onChange('customFooter', e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
          <ToggleRow label="Product catalog" checked={settings?.enableProductSection ?? true} onChange={(v) => onChange('enableProductSection', v)} />
          <ToggleRow label="About / company" checked={settings?.enableAboutSection ?? true} onChange={(v) => onChange('enableAboutSection', v)} />
          <ToggleRow label="Blog & insights" checked={settings?.enableBlogSection ?? true} onChange={(v) => onChange('enableBlogSection', v)} />
          <ToggleRow label="Inquiry form" checked={settings?.showInquiryForm ?? true} onChange={(v) => onChange('showInquiryForm', v)} />
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" type="email" value={settings?.contactEmail ?? ''} onChange={(e) => onChange('contactEmail', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input id="contactPhone" value={settings?.contactPhone ?? ''} onChange={(e) => onChange('contactPhone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp number</Label>
            <Input id="whatsappNumber" value={settings?.whatsappNumber ?? ''} onChange={(e) => onChange('whatsappNumber', e.target.value)} placeholder="+1 234 567 890" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}