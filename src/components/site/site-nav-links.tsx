'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PublicPage } from '@/lib/site/data';

const STATIC_NAV = [
  { href: '', label: 'Home' },
  { href: 'products', label: 'Products' },
  { href: 'about', label: 'About' },
  { href: 'blog', label: 'Blog' },
  { href: 'contact', label: 'Contact' }
];

export function SiteNavLinks({
  basePath,
  pages = [],
  isMobile = false
}: {
  basePath: string;
  pages?: PublicPage[];
  isMobile?: boolean;
}) {
  const pathname = usePathname();

  const linkClass = isMobile
    ? 'block px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900'
    : 'text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900';

  const items = [...STATIC_NAV, ...pages.map((p) => ({ href: p.slug, label: p.title }))];

  return (
    <>
      {items.map((item) => {
        const href = item.href === '' ? basePath : `${basePath}/${item.href}`;
        const active = item.href === '' ? pathname === basePath : pathname === href;
        return (
          <Link key={`${item.label}-${item.href}`} href={href} className={`${linkClass}${active ? ' !text-zinc-900' : ''}`}>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
