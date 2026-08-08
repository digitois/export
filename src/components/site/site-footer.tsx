import Link from 'next/link';
import type { PublicSite } from '@/lib/site/data';

export function SiteFooter({ site, basePath }: { site: PublicSite; basePath: string }) {
  const base = basePath;
  const markets = site.export_markets ?? [];

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-zinc-900">{site.company_name}</p>
          {site.tagline && <p className="mt-1 text-sm text-zinc-600">{site.tagline}</p>}
          {site.address_line1 && (
            <p className="mt-3 text-sm text-zinc-500">
              {site.address_line1}
              {site.city ? `, ${site.city}` : ''}
              {site.state ? `, ${site.state}` : ''}
              {site.country ? `, ${site.country}` : ''}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-900">Quick Links</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href={`${base}/products`} className="hover:text-zinc-900">Products</Link></li>
            <li><Link href={`${base}/about`} className="hover:text-zinc-900">About Us</Link></li>
            <li><Link href={`${base}/blog`} className="hover:text-zinc-900">Blog</Link></li>
            <li><Link href={`${base}/contact`} className="hover:text-zinc-900">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-900">Get in Touch</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {site.contact_email && (
              <li>
                <a href={`mailto:${site.contact_email}`} className="hover:text-zinc-900">{site.contact_email}</a>
              </li>
            )}
            {site.contact_phone && (
              <li>
                <a href={`tel:${site.contact_phone}`} className="hover:text-zinc-900">{site.contact_phone}</a>
              </li>
            )}
            {site.whatsapp_number && (
              <li>
                <a href={`https://wa.me/${site.whatsapp_number.replace(/\D/g, '')}`} className="hover:text-zinc-900">
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
          {markets.length > 0 && (
            <p className="mt-4 text-sm text-zinc-500">Exporting to: {markets.join(', ')}</p>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} {site.company_name}. All rights reserved.
      </div>
    </footer>
  );
}