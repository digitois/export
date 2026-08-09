import Link from 'next/link';
import type { PublicSite, PublicPage } from '@/lib/site/data';
import { SiteNavLinks } from '@/components/site/site-nav-links';

export function SiteHeader({ site, basePath, pages = [] }: { site: PublicSite; basePath: string; pages?: PublicPage[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={basePath} className="flex items-center gap-2">
          {site.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logo_url} alt={site.company_name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--site-accent)' }}
            >
              {site.company_name.charAt(0)}
            </span>
          )}
          <span className="text-lg font-bold">{site.company_name}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <SiteNavLinks basePath={basePath} pages={pages} />
        </nav>

        <a
          href={`${basePath}/contact`}
          className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:block"
          style={{ backgroundColor: 'var(--site-accent)' }}
        >
          Get a Quote
        </a>

        <details className="md:hidden">
          <summary className="cursor-pointer select-none px-2 py-1 text-2xl leading-none text-zinc-700">☰</summary>
          <nav className="absolute left-0 right-0 top-16 border-b border-zinc-200 bg-white px-2 py-2 shadow-lg">
            <SiteNavLinks basePath={basePath} pages={pages} isMobile />
          </nav>
        </details>
      </div>
    </header>
  );
}