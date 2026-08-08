'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '', label: 'Home' },
  { href: 'products', label: 'Products' },
  { href: 'blog', label: 'Blog' },
  { href: 'contact', label: 'Contact' }
];

export function SiteNavLinks({ basePath, isMobile = false }: { basePath: string; isMobile?: boolean }) {
  const pathname = usePathname();

  const linkClass = isMobile
    ? 'block px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900'
    : 'text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900';

  return (
    <>
      {NAV.map((item) => {
        const href = item.href === '' ? basePath : `${basePath}/${item.href}`;
        const active = item.href === '' ? pathname === basePath : pathname === href;
        return (
          <Link key={item.label} href={href} className={`${linkClass}${active ? ' !text-zinc-900' : ''}`}>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}