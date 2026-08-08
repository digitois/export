import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSite, getPublicProducts } from '@/lib/site/data';

export async function generateMetadata({ params }: { params: Promise<{ site: string; slug: string }> }): Promise<Metadata> {
  const { site: identifier, slug } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) return {};
  const products = await getPublicProducts(siteData.organization_id);
  const product = products.find((p) => p.slug === slug);
  return {
    title: product?.name ?? `${siteData.company_name} product`,
    description: product?.description ?? undefined
  };
}

export default async function SiteProductPage({ params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: identifier, slug } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const products = await getPublicProducts(siteData.organization_id);
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const specs = Object.entries(product.technical_specifications ?? {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="text-sm text-zinc-500">
        <Link href={base} className="hover:text-zinc-900">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`${base}/products`} className="hover:text-zinc-900">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
          {product.media[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.media[0].url} alt={product.media[0].alt_text ?? product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-4xl font-bold text-zinc-300">
              {product.name.charAt(0)}
            </div>
          )}
        </div>

        <div>
          {product.category && (
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">{product.category.name}</p>
          )}
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">{product.name}</h1>
          {product.description && <p className="mt-4 leading-relaxed text-zinc-600">{product.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {product.hsn_code && (
              <>
                <dt className="font-medium text-zinc-500">HS Code</dt>
                <dd className="text-zinc-900">{product.hsn_code}</dd>
              </>
            )}
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {product.moq && (
              <div className="rounded-lg border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Min Order Qty</p>
                <p className="mt-0.5 font-semibold text-zinc-900">{product.moq}</p>
              </div>
            )}
            {product.lead_time && (
              <div className="rounded-lg border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Lead Time</p>
                <p className="mt-0.5 font-semibold text-zinc-900">{product.lead_time}</p>
              </div>
            )}
            {product.packaging_details && (
              <div className="rounded-lg border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Packaging</p>
                <p className="mt-0.5 font-semibold text-zinc-900">{product.packaging_details}</p>
              </div>
            )}
            {product.price != null && (
              <div className="rounded-lg border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Price</p>
                <p className="mt-0.5 font-semibold text-zinc-900">
                  {product.currency} {product.price}{product.unit ? ` / ${product.unit}` : ''}
                </p>
              </div>
            )}
          </div>

          <a
            href={`${base}/contact`}
            className="mt-8 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--site-accent)' }}
          >
            Enquire About This Product
          </a>

          {specs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">Technical Specifications</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {specs.map(([key, value]) => (
                    <tr key={key} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-500">{key}</td>
                      <td className="py-2 text-zinc-900">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}