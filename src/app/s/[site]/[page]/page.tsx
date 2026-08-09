import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSite, getPublicPage, getPublicProducts, getPublicBlogPosts } from '@/lib/site/data';
import { SiteBlocks } from '@/components/site/site-blocks';
import { InquiryForm } from '@/components/site/inquiry-form';
import { isSiteBlockType, type SiteBlock } from '@/lib/site/blocks';

interface Props {
  params: Promise<{ site: string; page: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: identifier, page } = await params;
  const [siteData, pageData] = await Promise.all([
    getSite(decodeURIComponent(identifier)),
    getPublicPage(decodeURIComponent(identifier), page)
  ]);
  return {
    title: pageData?.title ? `${pageData.title} | ${siteData?.company_name ?? 'Company'}` : 'Page'
  };
}

export default async function CustomSitePage({ params }: Props) {
  const { site: identifier, page } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));

  if (!siteData) notFound();

  const pageData = await getPublicPage(siteData.organization_id, page);
  if (!pageData) notFound();

  const base = `/s/${identifier}`;
  const [products, posts] = await Promise.all([
    getPublicProducts(siteData.organization_id),
    getPublicBlogPosts(siteData.organization_id)
  ]);

  const rawBlocks = pageData.content?.blocks ?? [];
  const blocks: SiteBlock[] = Array.isArray(rawBlocks)
    ? rawBlocks.filter((b): b is SiteBlock => Boolean(b) && typeof b.type === 'string' && isSiteBlockType(b.type))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--site-heading-font)' }}>
          {pageData.title}
        </h1>
      </div>
      {blocks.length > 0 ? (
        <SiteBlocks blocks={blocks} site={siteData} basePath={base} products={products} posts={posts} />
      ) : (
        <p className="text-sm text-zinc-500">This page hasn&apos;t been published yet.</p>
      )}
      {siteData.show_inquiry_form && (
        <div className="mt-16 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <h3 className="text-xl font-bold">Get an Export Quote</h3>
          <p className="mt-1 text-sm text-zinc-500">Tell us what you need — we respond within 24 hours.</p>
          <InquiryForm organizationId={siteData.organization_id} className="mt-4" contactEmail={siteData.contact_email} />
        </div>
      )}
    </div>
  );
}
