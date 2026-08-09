'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { SiteBlocks } from '@/components/site/site-blocks';
import { getSiteTheme } from '@/lib/site/themes';
import { instantiateTemplate, type SiteTemplate } from '@/lib/site/templates';
import type { PublicSite } from '@/lib/site/data';
import { cn } from '@/lib/utils';

/** Minimal stand-in site so the real public renderer can draw a faithful preview. */
function mockSite(template: SiteTemplate): PublicSite {
  return {
    organization_id: 'preview',
    company_name: template.name,
    logo_url: null,
    website_subdomain: 'preview',
    slug: 'preview',
    default_currency: 'USD',
    theme: template.themeId,
    primary_color: template.primaryColor,
    accent_color: template.accentColor,
    hero_heading: null,
    hero_subheading: null,
    hero_eyebrow: null,
    cta_label: null,
    enable_product_section: true,
    enable_about_section: true,
    enable_blog_section: true,
    hero_image_url: null,
    announcement_bar: null,
    show_inquiry_form: true,
    contact_email: 'sales@yourcompany.com',
    contact_phone: '+91 00000 00000',
    whatsapp_number: '+91 00000 00000',
    custom_domain: null,
    custom_footer: null,
    blocks: null,
    about: null,
    tagline: null,
    export_markets: ['USA', 'UAE', 'Germany', 'Japan'],
    product_categories: null,
    certifications: ['ISO 9001', 'FSSAI', 'REACH'],
    social_links: null,
    address_line1: null,
    city: null,
    state: null,
    country: 'India',
    pincode: null,
    iec_number: 'ABCDE1234F',
    website: null,
    contact_person: null,
    email: null,
    phone: null
  };
}

function themeVars(template: SiteTemplate): CSSProperties {
  const theme = getSiteTheme(template.themeId);
  return {
    ['--site-primary' as string]: template.primaryColor,
    ['--site-accent' as string]: template.accentColor,
    ['--site-heading-font' as string]: theme.headingFont,
    ['--site-body-font' as string]: theme.bodyFont,
    ['--site-radius' as string]: theme.radius,
    ['--site-hero-bg' as string]: template.primaryColor,
    ['--site-hero-text' as string]: theme.hero.text
  };
}

interface TemplatePreviewProps {
  template: SiteTemplate;
  /** Toolbar with device toggle. Off for small thumbnails. */
  showToolbar?: boolean;
  className?: string;
}

export function TemplatePreview({ template, showToolbar = true, className }: TemplatePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const site = useMemo(() => mockSite(template), [template]);
  const blocks = useMemo(() => instantiateTemplate(template).blocks, [template]);
  const vars = useMemo(() => themeVars(template), [template]);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border bg-white', className)}>
      {showToolbar && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="text-xs text-muted-foreground">{template.name}</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={cn('rounded p-1', device === 'desktop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
              title="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={cn('rounded p-1', device === 'mobile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto transition-all" style={{ ...vars, maxWidth: device === 'mobile' ? 390 : '100%' }}>
          <SiteBlocks blocks={blocks} site={site} basePath="#" products={[]} posts={[]} preview />
        </div>
      </div>
    </div>
  );
}
