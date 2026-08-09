import type { ReactNode } from 'react';
import type { SiteBlock } from '@/lib/site/blocks';
import { cn } from '@/lib/utils';

const PRIMARY = 'var(--site-primary, #0f172a)';
const ACCENT = 'var(--site-accent, #0284c7)';
const MUTED = '#64748b';

function str(props: Record<string, unknown>, key: string, fallback = ''): string {
  const v = props[key];
  return typeof v === 'string' ? v : fallback;
}

function num(props: Record<string, unknown>, key: string, fallback: number): number {
  const v = props[key];
  return typeof v === 'number' ? v : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function items(props: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = props[key];
  return Array.isArray(v) ? v.filter(isRecord) : [];
}

function placeholders(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i);
}

function ImgPlaceholder({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-400', className)}>
      {children}
    </div>
  );
}

export function BlockPreview({ block }: { block: SiteBlock }) {
  switch (block.type) {
    case 'hero': {
      const heading = str(block.props, 'heading');
      return (
        <div
          className="overflow-hidden rounded-xl p-8 text-center text-white"
          style={{ background: `linear-gradient(120deg, ${PRIMARY}, ${ACCENT})` }}
        >
          {str(block.props, 'eyebrow') && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {str(block.props, 'eyebrow')}
            </p>
          )}
          <p className="text-xl font-bold leading-tight md:text-2xl">{heading || 'Your hero heading'}</p>
          {str(block.props, 'subheading') && (
            <p className="mx-auto mt-2 max-w-md text-xs opacity-90">{str(block.props, 'subheading')}</p>
          )}
          {str(block.props, 'ctaLabel') && (
            <span className="mt-4 inline-block rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold">
              {str(block.props, 'ctaLabel')}
            </span>
          )}
        </div>
      );
    }
    case 'products':
      return (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-semibold">{str(block.props, 'title', 'Featured Products')}</p>
            {str(block.props, 'subtitle') && <p className="text-xs" style={{ color: MUTED }}>{str(block.props, 'subtitle')}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['Ground Turmeric', 'Chilli Powder', 'Cardamom'].map((name, i) => (
              <div key={name} className="overflow-hidden rounded-lg border bg-background">
                <ImgPlaceholder className="h-16" />
                <div className="p-2 text-center">
                  <p className="text-xs font-medium">{name}</p>
                  <p className="text-[11px]" style={{ color: ACCENT }}>Sample SKU {i + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'features': {
      const list = items(block.props, 'items');
      return (
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold">{str(block.props, 'title', 'Why Choose Us')}</p>
          <div className="grid grid-cols-3 gap-3">
            {(list.length ? list : [{ title: 'Certified Quality' }, { title: 'Global Reach' }, { title: 'Reliable Logistics' }]).map(
              (f, i) => (
                <div key={i} className="rounded-lg border bg-background p-3 text-center">
                  <span className="mx-auto block h-6 w-6 rounded-full" style={{ background: ACCENT, opacity: 0.9 }} />
                  <p className="mt-2 text-xs font-semibold">{str(f, 'title', 'Feature')}</p>
                  <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: MUTED }}>
                    {str(f, 'description', 'Short feature description.')}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      );
    }
    case 'about':
      return (
        <div className="grid grid-cols-2 gap-4">
          <ImgPlaceholder className="aspect-square rounded-lg" />
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold">{str(block.props, 'title', 'About Us')}</p>
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed" style={{ color: MUTED }}>
              {str(block.props, 'body') ||
                'A trusted manufacturer and exporter delivering premium products and export-certified grades to buyers worldwide.'}
            </p>
          </div>
        </div>
      );
    case 'stats': {
      const list = items(block.props, 'items');
      return (
        <div className="rounded-xl p-4" style={{ background: PRIMARY }}>
          <div className="grid grid-cols-3 gap-4 text-center text-white">
            {(list.length ? list : [{ value: '25+', label: 'Years' }, { value: '40', label: 'Countries' }, { value: '1200', label: 'Clients' }]).map(
              (s, i) => (
                <div key={i}>
                  <p className="text-lg font-bold">{str(s, 'value', '—')}</p>
                  <p className="text-[11px] opacity-80">{str(s, 'label', 'Label')}</p>
                </div>
              )
            )}
          </div>
        </div>
      );
    }
    case 'testimonials': {
      const list = items(block.props, 'items');
      return (
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold">{str(block.props, 'title', 'What Our Buyers Say')}</p>
          <div className="grid grid-cols-2 gap-3">
            {(list.length ? list : [{ quote: 'Reliable supplier with great quality.', author: 'John Carter', company: 'Carter Imports' }]).map((t, i) => (
              <div key={i} className="rounded-lg border bg-background p-3">
                <p className="line-clamp-2 text-xs italic leading-relaxed">“{str(t, 'quote', 'Great experience working with this partner.')}”</p>
                <p className="mt-2 text-xs font-semibold">{str(t, 'author', 'Author name')}</p>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {str(t, 'company', 'Company')}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'faq': {
      const list = items(block.props, 'items');
      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{str(block.props, 'title', 'Frequently Asked Questions')}</p>
          {(list.length ? list : [{ q: 'What is your minimum order quantity?', a: 'MOQs vary by product.' }]).map((f, i) => (
            <div key={i} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold">{str(f, 'q', 'Question')}</p>
              <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: MUTED }}>
                {str(f, 'a', 'Answer')}
              </p>
            </div>
          ))}
        </div>
      );
    }
    case 'cta':
      return (
        <div className="flex items-center justify-between gap-4 rounded-xl p-6" style={{ background: `linear-gradient(120deg, ${PRIMARY}, ${ACCENT})` }}>
          <div className="text-white">
            <p className="text-sm font-semibold">{str(block.props, 'heading', 'Ready to import?')}</p>
            <p className="text-xs opacity-90">{str(block.props, 'subheading', 'Get a quote within 24 hours.')}</p>
          </div>
          <span className="shrink-0 rounded-full border border-white/40 px-4 py-1.5 text-xs font-semibold text-white">
            {str(block.props, 'label', 'Contact Us')}
          </span>
        </div>
      );
    case 'blog':
      return (
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold">{str(block.props, 'title', 'Insights & Guides')}</p>
          <div className="grid grid-cols-3 gap-3">
            {['Packaging for Export', 'Incoterms Explained', 'Sourcing Guide'].map((t, i) => (
              <div key={t} className="overflow-hidden rounded-lg border bg-background">
                <ImgPlaceholder className="h-14" />
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium">{t}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>Post {i + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'gallery': {
      const list = items(block.props, 'images');
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{str(block.props, 'title', 'Our Gallery')}</p>
          <div className="grid grid-cols-4 gap-2">
            {(list.length ? list : [{ url: '' }, { url: '' }, { url: '' }, { url: '' }]).map((g, i) => (
              <ImgPlaceholder key={i} className="aspect-square rounded-lg">
                <span className="text-[9px] font-semibold uppercase tracking-wider">Photo</span>
              </ImgPlaceholder>
            ))}
          </div>
        </div>
      );
    }
    case 'contact':
      return (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <p className="text-sm font-semibold">{str(block.props, 'title', 'Get in Touch')}</p>
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {str(block.props, 'subtitle', 'We respond within 24 hours.')}
            </p>
            <div className="mt-3 space-y-1.5 text-xs" style={{ color: MUTED }}>
              <p>sales@yourcompany.com</p>
              <p>+91 00000 00000</p>
              <p>WhatsApp available</p>
            </div>
          </div>
          <div className="col-span-3 space-y-2">
            <p className="h-6 rounded bg-muted/70" />
            <p className="h-6 rounded bg-muted/70" />
            <p className="h-10 rounded bg-muted/70" />
            <button type="button" className="h-7 w-24 rounded-full text-xs font-semibold text-white" style={{ background: PRIMARY }}>
              Send
            </button>
          </div>
        </div>
      );
    case 'text':
      return (
        <p className="text-xs leading-relaxed" style={{ color: '#334155' }}>
          {str(block.props, 'content', 'Write something about your company here…')}
        </p>
      );
    case 'spacer':
      return <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/40" style={{ height: Math.min(num(block.props, 'height', 64), 200), minHeight: 40 }}>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Spacer</span>
        <span className="text-[10px] text-muted-foreground">{num(block.props, 'height', 64)}px</span>
      </div>;
    case 'html':
      return (
        <pre className="max-h-40 overflow-hidden rounded-lg border bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
          {str(block.props, 'code', '<!-- Paste HTML here -->')}
        </pre>
      );
    default:
      return null;
  }
}