import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSite, getPublicProducts } from '@/lib/site/data';

export default async function SiteProductsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const products = await getPublicProducts(siteData.organization_id);

  const categories = [...new Set(products.flatMap((p) => (p.category ? [p.category.slug] : [])))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
        OUR PRODUCTS
      </p>
      <h1 className="mt-1 text-3xl font-bold">Products of {siteData.company_name}</h1>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white">All</span>
          {categories.map((cat) => (
            <span key={cat} className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700">
              {cat.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-zinc-500">No products published yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const content = (
              <>
                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                  {product.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.media[0].url}
                      alt={product.media[0].alt_text ?? product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      {product.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {product.category && (
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{product.category.name}</p>
                  )}
                  <h2 className="mt-1 font-semibold text-zinc-900">{product.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{product.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {product.moq && <span>MOQ: {product.moq}</span>}
                    {product.lead_time && <span>Lead: {product.lead_time}</span>}
                    {product.price != null && (
                      <span className="font-semibold text-zinc-900">
                        {product.currency} {product.price}{product.unit ? ` / ${product.unit}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
            return (
              <Link
                key={product.id}
                href={`${base}/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg"
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}