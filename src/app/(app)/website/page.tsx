'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Check, ExternalLink, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SITE_THEME_LIST, getSiteTheme, type ThemeId } from '@/lib/site/themes';
import { cn } from '@/lib/utils';

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
}

export default function WebsiteBuilderPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [websiteSubdomain, setWebsiteSubdomain] = useState('');

  useEffect(() => {
    api<{ data: Settings }>('/api/website/settings')
      .then((res) => {
        setSettings(res.data);
        setWebsiteSubdomain(String((res.data as { websiteSubdomain?: string }).websiteSubdomain ?? ''));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const theme = useMemo(() => getSiteTheme(settings?.theme), [settings?.theme]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await api('/api/website/settings', { method: 'PUT', body: settings });
      toast.success('Website settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!settings) return;
    const next = !settings.isPublished;
    setSaving(true);
    try {
      await api('/api/website/settings', { method: 'POST', body: { isPublished: next } });
      setSettings((prev) => (prev ? { ...prev, isPublished: next } : prev));
      toast.success(next ? 'Website published' : 'Website unpublished');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const siteUrl = websiteSubdomain ? `/s/${websiteSubdomain}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="Pick a theme, customize your export site, and publish — in minutes."
      >
        {siteUrl && (
          <Button variant="outline" asChild>
            <Link href={siteUrl} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> View site
            </Link>
          </Button>
        )}
        <Button variant={settings?.isPublished ? 'secondary' : 'default'} onClick={togglePublish} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : settings?.isPublished ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
          {settings?.isPublished ? 'Published' : 'Publish site'}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Choose your theme</CardTitle>
          <CardDescription>8 ready-made designs. Your colors and content apply automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SITE_THEME_LIST.map((t) => {
              const selected = settings?.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => update('theme', t.id)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border text-left transition-all',
                    selected ? 'ring-2 ring-primary' : 'hover:border-foreground/30'
                  )}
                >
                  <div className="flex h-24 items-end p-3" style={{ background: t.hero.bg }}>
                    <span
                      className="text-lg font-bold"
                      style={{ color: t.hero.text, fontFamily: t.headingFont }}
                    >
                      Aa
                    </span>
                    <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: t.hero.accent, color: t.hero.bg }}>
                      Sample
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  {selected && (
                    <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hero & Content</CardTitle>
            <CardDescription>What visitors see first.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroEyebrow">Eyebrow (small label above title)</Label>
              <Input id="heroEyebrow" placeholder="e.g. Premium Spices Since 1998" value={settings?.heroEyebrow ?? ''} onChange={(e) => update('heroEyebrow', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroHeading">Hero Heading</Label>
              <Input id="heroHeading" value={settings?.heroHeading ?? ''} onChange={(e) => update('heroHeading', e.target.value)} placeholder="e.g. Premium Organic Spices — Global Exporter" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubheading">Subheading</Label>
              <Textarea id="heroSubheading" rows={2} value={settings?.heroSubheading ?? ''} onChange={(e) => update('heroSubheading', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcementBar">Announcement Bar</Label>
              <Input id="announcementBar" value={settings?.announcementBar ?? ''} onChange={(e) => update('announcementBar', e.target.value)} placeholder="e.g. Worldwide shipping available" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaLabel">CTA Button Text</Label>
              <Input id="ctaLabel" value={settings?.ctaLabel ?? ''} onChange={(e) => update('ctaLabel', e.target.value)} placeholder="Request a Quote" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImageUrl">Hero Background Image URL</Label>
              <Input id="heroImageUrl" value={settings?.heroImageUrl ?? ''} onChange={(e) => update('heroImageUrl', e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customFooter">Custom Footer Text</Label>
              <Input id="customFooter" value={settings?.customFooter ?? ''} onChange={(e) => update('customFooter', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>Override theme brand colors.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="primaryColor" value={settings?.primaryColor ?? '#0f172a'} onChange={(e) => update('primaryColor', e.target.value)} className="h-10 w-12 cursor-pointer rounded border bg-transparent p-1" />
                  <Input value={settings?.primaryColor ?? ''} onChange={(e) => update('primaryColor', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="accentColor" value={settings?.accentColor ?? '#0284c7'} onChange={(e) => update('accentColor', e.target.value)} className="h-10 w-12 cursor-pointer rounded border bg-background p-1" />
                  <Input value={settings?.accentColor ?? ''} onChange={(e) => update('accentColor', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
              <CardDescription>Choose which parts of your homepage appear.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Product Catalog" checked={settings?.enableProductSection ?? true} onCheckedChange={(v) => update('enableProductSection', v)} />
              <ToggleRow label="About / Company" checked={settings?.enableAboutSection ?? true} onCheckedChange={(v) => update('enableAboutSection', v)} />
              <ToggleRow label="Blog & Insights" checked={settings?.enableBlogSection ?? true} onCheckedChange={(v) => update('enableBlogSection', v)} />
              <ToggleRow label="Inquiry Form" checked={settings?.showInquiryForm ?? true} onCheckedChange={(v) => update('showInquiryForm', v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Support</CardTitle>
              <CardDescription>Details shown in the site footer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" value={settings?.contactEmail ?? ''} onChange={(e) => update('contactEmail', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" value={settings?.contactPhone ?? ''} onChange={(e) => update('contactPhone', e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number (international format)</Label>
                <Input id="whatsappNumber" value={settings?.whatsappNumber ?? ''} onChange={(e) => update('whatsappNumber', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}