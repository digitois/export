import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSite, type PublicSite } from '@/lib/site/data';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteVisitTracker } from '@/components/site/site-visit-tracker';

interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}

export async function generateMetadata({ params }: SiteLayoutProps): Promise<Metadata> {
  const { site } = await params;
  const data = await getSite(decodeURIComponent(site));
  const name = data?.company_name ?? 'Company';
  const title = `${name} | ${data?.tagline ?? data?.hero_heading ?? 'Exporter & Supplier'}`;
  const description = data?.about ?? data?.hero_subheading ?? `Official website of ${name}.`;

  return {
    title,
    description,
    icons: data?.logo_url ? { icon: data.logo_url } : undefined,
    openGraph: data?.logo_url ? { images: [{ url: data.logo_url }] } : undefined
  };
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));

  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const primary = siteData.primary_color ?? '#0f172a';
  const accent = siteData.accent_color ?? '#0284c7';

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased" style={{ ['--site-primary' as string]: primary, ['--site-accent' as string]: accent }}>
      {siteData.announcement_bar && (
        <div className="bg-black px-4 py-2 text-center text-sm text-white">{siteData.announcement_bar}</div>
      )}
      <SiteHeader site={siteData} basePath={base} />
      <main>{children}</main>
      <SiteFooter site={siteData} basePath={base} />
      <SiteVisitTracker siteId={siteData.organization_id} />
    </div>
  );
}