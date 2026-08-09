'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  ShieldCheck,
  Truck,
  Globe,
  Leaf,
  Factory,
  Package,
  Handshake,
  PackageCheck,
  Recycle,
  Cog,
  Palette,
  FlaskConical,
  type LucideIcon
} from 'lucide-react';
import type { SiteBlock, SiteBlockType } from '@/lib/site/blocks';
import type { PublicSite, PublicProduct, PublicBlogPost } from '@/lib/site/data';
import { InquiryForm } from './inquiry-form';

const FEATURE_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  ShieldCheck,
  Truck,
  Globe,
  Leaf,
  Factory,
  Package,
  Handshake,
  PackageCheck,
  Recycle,
  Cog,
  Palette,
  FlaskConical
};

interface SiteBlocksProps {
  blocks: SiteBlock[];
  site: PublicSite;
  basePath: string;
  products: PublicProduct[];
  posts: PublicBlogPost[];
  preview?: boolean;
}

export function SiteBlocks({ blocks, site, basePath, products, posts, preview }: SiteBlocksProps) {
  return (
    <>
      {blocks.map((block) => (
        <SiteBlockView key={block.id} block={block} site={site} basePath={basePath} products={products} posts={posts} preview={preview} />
      ))}
    </>
  );
}

function SiteBlockView({ block, site, basePath, products, posts, preview }: Omit<SiteBlocksProps, 'blocks'> & { block: SiteBlock }) {
  const p = block.props ?? {};
  const title = p.title ? String(p.title) : undefined;
  const subtitle = p.subtitle || p.subheading ? String(p.subtitle || p.subheading) : undefined;
  const eyebrow = p.eyebrow ? String(p.eyebrow) : undefined;

  switch (block.type) {
    case 'hero':
      return (
        <section className="relative">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(p.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'var(--site-hero-bg, var(--site-primary))' }} />
          )}
          {p.overlay !== false && <div className="absolute inset-0 bg-zinc-900/70" />}
          <div className={`relative mx-auto max-w-6xl px-4 py-24 md:py-32 ${p.align === 'left' ? 'text-left' : p.align === 'split' ? 'text-left' : 'text-center'}`}>
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">{eyebrow}</p>}
            <h1
              className={`mx-auto max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl ${p.align !== 'left' && p.align !== 'split' ? '' : 'mx-0'}`}
              style={{ fontFamily: 'var(--site-heading-font)' }}
            >
              {String(p.heading ?? `${site.company_name} — Global Exporter`)}
            </h1>
            {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-200">{subtitle}</p>}
            {Boolean(String(p.ctaLabel || '') || String(p.ctaHref || '')) && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`${basePath}${p.ctaHref || '/contact'}`}
                  className="px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--site-accent)', borderRadius: 'var(--site-radius)' }}
                >
                  {String(p.ctaLabel || 'Request a Quote')}
                </Link>
              </div>
            )}
            {site.certifications && site.certifications.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2">
                {site.certifications.map((cert) => (
                  <span key={cert} className="rounded-full border border-zinc-400/60 px-3 py-1 text-xs text-zinc-200">
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      );

    case 'products':
      return (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading title={title} subtitle={subtitle} eyebrow="OUR PRODUCTS" align="center" />
          <div className={`grid gap-6 ${columnsClass(p.columns)}`}>
            {products.slice(0, Number(p.limit || 6)).map((product) => (
              <Link key={product.id} href={`${basePath}/products/${product.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg">
                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                  {product.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.media[0].url} alt={product.media[0].alt_text ?? product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">{product.name.charAt(0)}</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-900">{product.name}</h3>
                  {product.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{product.description}</p>}
                  {product.moq && <p className="mt-2 text-xs text-zinc-400">MOQ: {product.moq}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      );

    case 'features':
      return (
        <section className="bg-zinc-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title={title} subtitle={subtitle} eyebrow="WHY US" align="center" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items(p.items).map((item, i) => {
                const Icon = FEATURE_ICONS[String(item.icon || '')] ?? BadgeCheck;
                return (
                  <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--site-primary)' }}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mt-4 font-semibold text-zinc-900">{item.title}</h3>
                    {item.description && <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );

    case 'about':
      return (
        <section className="bg-zinc-50 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
            <div>
              <SectionHeading title={title} eyebrow="ABOUT US" align="left" />
              {site.tagline && <p className="mt-4 text-lg text-zinc-700">{site.tagline}</p>}
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">{String(p.body || site.about || `We are ${site.company_name}, an export-focused company.'`)}</p>
              {site.export_markets && site.export_markets.length > 0 && (
                <p className="mt-4 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">Export Markets:</span> {site.export_markets.join(', ')}
                </p>
              )}
              {site.iec_number && (
                <p className="mt-2 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">IEC Number:</span> {site.iec_number}
                </p>
              )}
            </div>
            {p.imageUrl ? (
              <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(p.imageUrl)} alt={title ?? 'About'} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-zinc-400">Company image</div>
            )}
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="py-14" style={{ backgroundColor: 'var(--site-primary)' }}>
          <div className="mx-auto max-w-6xl px-4">
            {title && <SectionHeading title={title} align="center" light />}
            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
              {items(p.items).map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl font-bold text-white">{item.value}</div>
                  <div className="mt-1 text-sm text-zinc-300">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading title={title} subtitle={subtitle} eyebrow="TESTIMONIALS" align="center" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {items(p.items).map((item, i) => (
              <div key={i} className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm leading-relaxed text-zinc-700">“{item.quote}”</p>
                <div className="mt-4">
                  <p className="font-semibold text-zinc-900">{item.author}</p>
                  {(item.role || item.company) && <p className="text-sm text-zinc-500">{[item.role, item.company].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="bg-zinc-50 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <SectionHeading title={title} subtitle={subtitle} eyebrow="FAQ" align="center" />
            <div className="mt-8 space-y-3">
              {items(p.items).map((item, i) => (
                <details key={i} className="group rounded-xl border border-zinc-200 bg-white p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-900">
                    {item.q}
                    <span className="text-zinc-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="relative overflow-hidden bg-black py-16">
          <div className="absolute inset-0" style={{ background: 'var(--site-primary)' }} />
          <div className="relative mx-auto max-w-4xl px-4 text-center text-white">
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: 'var(--site-heading-font)' }}>
              {String(p.heading || 'Ready to start importing?')}
            </h2>
            {subtitle && <p className="mx-auto mt-3 max-w-xl text-zinc-300">{subtitle}</p>}
            <div className="mt-8">
              <Link
                href={`${basePath}${p.href || '/contact'}`}
                className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--site-accent)', borderRadius: 'var(--site-radius)' }}
              >
                {String(p.label || 'Contact Us')}
              </Link>
            </div>
          </div>
        </section>
      );

    case 'blog':
      return (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <SectionHeading title={title} subtitle={subtitle} eyebrow="BLOG" align="left" />
            <Link href={`${basePath}/blog`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {posts.slice(0, Number(p.limit || 3)).map((post) => (
              <Link key={post.id} href={`${basePath}/blog/${post.slug}`} className="group">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : null}
                </div>
                <h3 className="mt-3 font-semibold text-zinc-900 group-hover:underline">{post.title}</h3>
                {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{post.excerpt}</p>}
              </Link>
            ))}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading title={title} eyebrow="GALLERY" align="center" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {(p.images as { url: string; caption?: string }[] ?? []).map((img, i) => (
              <div key={i} className="group overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
                {img.caption && <p className="px-1 py-1 text-center text-xs text-zinc-500">{img.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'contact':
      if (preview) {
        return (
          <section className="bg-zinc-50 py-16">
            <div className="mx-auto max-w-6xl px-4">
              <SectionHeading title={title} subtitle={subtitle} eyebrow="CONTACT" align="center" />
            </div>
          </section>
        );
      }
      return (
        <section className="bg-zinc-50 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
            <div>
              <SectionHeading title={title} eyebrow="CONTACT" align="left" />
              <p className="mt-3 text-sm text-zinc-600">{subtitle ?? 'We respond within 24 hours.'}</p>
              {site.contact_email && <p className="mt-4 text-sm text-zinc-700">📧 {site.contact_email}</p>}
              {site.contact_phone && <p className="mt-2 text-sm text-zinc-700">📞 {site.contact_phone}</p>}
              {site.whatsapp_number && <p className="mt-2 text-sm text-zinc-700">💬 WhatsApp: {site.whatsapp_number}</p>}
            </div>
            {p.showForm !== false && (
              <InquiryForm organizationId={site.organization_id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" contactEmail={site.contact_email} />
            )}
          </div>
        </section>
      );

    case 'text':
      return (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{String(p.content || '')}</div>
        </section>
      );

    case 'spacer':
      return <div style={{ height: Number(p.height || 64) }} />;

    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: String(p.code || '') }} />;

    default:
      return null;
  }
}

function SectionHeading({
  title,
  subtitle,
  eyebrow,
  align,
  light
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  align: 'left' | 'center';
  light?: boolean;
}) {
  if (!title) return null;
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className={`text-sm font-semibold ${light ? 'text-zinc-300' : ''}`} style={{ color: light ? undefined : 'var(--site-accent)' }}>{eyebrow}</p>}
      <h2 className={`mt-1 max-w-2xl text-3xl font-bold ${light ? 'text-white' : 'text-zinc-900'} ${align === 'center' ? 'mx-auto' : ''}`} style={{ fontFamily: 'var(--site-heading-font)' }}>
        {title}
      </h2>
      {subtitle && <p className={`mt-2 max-w-2xl text-sm ${light ? 'text-zinc-300' : 'text-zinc-500'} ${align === 'center' ? 'mx-auto' : ''}`}>{subtitle}</p>}
    </div>
  );
}

function items(raw: unknown): Array<Record<string, string>> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is Record<string, string> => typeof x === 'object' && x !== null);
}

function columnsClass(columns: unknown): string {
  const n = Number(columns || 3);
  if (n === 2) return 'sm:grid-cols-2';
  if (n === 4) return 'sm:grid-cols-2 lg:grid-cols-4';
  return 'sm:grid-cols-2 lg:grid-cols-3';
}