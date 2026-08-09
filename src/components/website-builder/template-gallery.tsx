'use client';

import { useState } from 'react';
import {
  Wheat,
  Flame,
  Recycle,
  Cog,
  Shirt,
  Palette,
  FlaskConical,
  Package,
  Eye,
  Check,
  Layers,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSiteTheme } from '@/lib/site/themes';
import { INDUSTRY_META, TEMPLATE_LIST, type Industry, type SiteTemplate } from '@/lib/site/templates';
import { TemplatePreview } from './template-preview';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Wheat, Flame, Recycle, Cog, Shirt, Palette, FlaskConical, Package };

interface TemplateGalleryProps {
  onUse: (template: SiteTemplate) => void;
  onStartBlank: () => void;
  busyTemplateId?: string | null;
}

export function TemplateGallery({ onUse, onStartBlank, busyTemplateId }: TemplateGalleryProps) {
  const [industry, setIndustry] = useState<Industry | 'all'>('all');
  const [previewing, setPreviewing] = useState<SiteTemplate | null>(null);

  const templates = industry === 'all' ? TEMPLATE_LIST : TEMPLATE_LIST.filter((t) => t.industry === industry);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 text-center sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Layers className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Choose a starting point</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          Pick an industry-ready design, then customize every section, color and word. You can switch templates later.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <IndustryChip active={industry === 'all'} icon={Layers} label="All" onClick={() => setIndustry('all')} />
        {INDUSTRY_META.map((meta) => (
          <IndustryChip
            key={meta.id}
            active={industry === meta.id}
            icon={ICONS[meta.icon] ?? Package}
            label={meta.label}
            onClick={() => setIndustry(meta.id)}
          />
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            busy={busyTemplateId === template.id}
            onPreview={() => setPreviewing(template)}
            onUse={() => onUse(template)}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 border-t pt-6 text-sm text-muted-foreground">
        <span>Prefer to build from scratch?</span>
        <button type="button" onClick={onStartBlank} className="font-medium text-foreground underline-offset-4 hover:underline">
          Start with a blank canvas
        </button>
      </div>

      <Dialog open={Boolean(previewing)} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
          {previewing && (
            <>
              <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
                <div>
                  <DialogTitle className="text-base">{previewing.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{previewing.description}</p>
                </div>
                <Button
                  className="mr-6"
                  disabled={busyTemplateId === previewing.id}
                  onClick={() => onUse(previewing)}
                >
                  {busyTemplateId === previewing.id ? 'Applying…' : 'Use this template'}
                </Button>
              </DialogHeader>
              <div className="h-[70vh] bg-muted/30 p-4">
                <TemplatePreview template={previewing} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndustryChip({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TemplateCard({ template, busy, onPreview, onUse }: { template: SiteTemplate; busy: boolean; onPreview: () => void; onUse: () => void }) {
  const theme = getSiteTheme(template.themeId);
  const industryLabel = INDUSTRY_META.find((i) => i.id === template.industry)?.label ?? 'General';
  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-52 overflow-hidden border-b bg-white">
        <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.5]" style={{ width: '200%', height: '200%' }}>
          <TemplatePreview template={template} showToolbar={false} className="h-full rounded-none border-0" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/0 opacity-0 transition-all group-hover:bg-slate-900/40 group-hover:opacity-100">
          <Button size="sm" variant="secondary" onClick={onPreview}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button size="sm" disabled={busy} onClick={onUse}>
            {busy ? 'Applying…' : (<><Check className="h-4 w-4" /> Use</>)}
          </Button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{template.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{industryLabel}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: template.primaryColor }} title="Primary" />
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: template.accentColor }} title="Accent" />
          <span className="ml-1 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{theme.name}</span>
        </span>
      </div>
    </div>
  );
}
