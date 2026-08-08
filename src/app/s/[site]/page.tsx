import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSite, getPublicProducts, getPublicBlogPosts } from '@/lib/site/data';
import { InquiryForm } from '@/components/site/inquiry-form';

export default async function SiteHomePage({ params }: { params: Promise<{ site: string }> }) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));

  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const [products, posts] = await Promise.all([
    getPublicProducts(siteData.organization_id),
    getPublicBlogPosts(siteData.organization_id)
  ]);

  const heroBg = siteData.hero_image_url;

  return (
    <>
      <section className="relative">
        {heroBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--site-primary)' }} />
        )}
        <div className="absolute inset-0 bg-zinc-900/70" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center text-white md:py-32">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            {siteData.hero_heading ?? `${siteData.company_name} — Global Exporter`}
          </h1>
          {siteData.hero_subheading && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-200">{siteData.hero_subheading}</p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`${base}/products`}
              className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--site-accent)' }}
            >
              Explore Products
            </Link>
            <Link
              href={`${base}/contact`}
              className="rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-zinc-900"
            >
              Request a Quote
            </Link>
          </div>
          {siteData.certifications && siteData.certifications.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {siteData.certifications.map((cert) => (
                <span key={cert} className="rounded-full border border-zinc-400/60 px-3 py-1 text-xs text-zinc-200">
                  {cert}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {products.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
                OUR PRODUCTS
              </p>
              <h2 className="mt-1 text-3xl font-bold">Featured Products</h2>
            </div>
            <Link href={`${base}/products`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
              View all →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <Link
                key={product.id}
                href={`${base}/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                  {product.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.media[0].url}
                      alt={product.media[0].alt_text ?? product.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      {product.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-900">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{product.description}</p>
                  {product.moq && <p className="mt-2 text-xs text-zinc-400">MOQ: {product.moq}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {siteData.about && (
        <section className="bg-zinc-50 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
                ABOUT US
              </p>
              <h2 className="mt-1 text-3xl font-bold">{siteData.company_name}</h2>
              {siteData.tagline && <p className="mt-3 text-lg text-zinc-700">{siteData.tagline}</p>}
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">{siteData.about}</p>
              {siteData.export_markets && siteData.export_markets.length > 0 && (
                <p className="mt-4 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">Export Markets:</span> {siteData.export_markets.join(', ')}
                </p>
              )}
              {siteData.iec_number && (
                <p className="mt-2 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">IEC Number:</span> {siteData.iec_number}
                </p>
              )}
            </div>

            {siteData.show_inquiry_form && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold">Get an Export Quote</h3>
                <p className="mt-1 text-sm text-zinc-500">Tell us what you need — we respond within 24 hours.</p>
                <InquiryForm
                  organizationId={siteData.organization_id}
                  className="mt-4"
                  contactEmail={siteData.contact_email}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
                BLOG
              </p>
              <h2 className="mt-1 text-3xl font-bold">Insights & Guides</h2>
            </div>
            <Link href={`${base}/blog`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.id} href={`${base}/blog/${post.slug}`} className="group">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <h3 className="mt-3 font-semibold text-zinc-900 group-hover:underline">{post.title}</h3>
                {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{post.excerpt}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}