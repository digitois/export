import Link from 'next/link';
import { ArrowRight, Ship } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const nav = [
  { href: '/#features', label: 'Features' },
  { href: '/#modules', label: 'Platform' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' }
];

const productLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#modules', label: 'Platform' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
  { href: '/signup', label: 'Start free trial' }
];

const companyLinks = [
  { href: '/login', label: 'Log in' },
  { href: '/signup', label: 'Create account' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Platform Admin' }
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#363D42]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#041902]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#041902]">
              <Ship className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              Export<span className="text-[#0B6B63]">OS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-[#041902] transition-all hover:bg-white/90"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <details className="group md:hidden">
            <summary className="flex h-9 w-9 list-none items-center justify-center rounded-lg text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-4 top-16 w-56 rounded-xl border border-white/10 bg-[#041902] p-3 shadow-2xl">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-white/10 pt-2">
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="mt-1 block rounded-full bg-white px-3 py-2 text-center text-sm font-semibold text-[#041902] hover:bg-white/90"
                >
                  Start free
                </Link>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#041902] text-white/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#041902]">
                  <Ship className="h-4 w-4" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-white">
                  Export<span className="text-[#0B6B63]">OS</span>
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed">
                {APP_NAME} is the all-in-one operating system for Indian exporters — websites, HS code
                search, quotations, invoices, shipments and AI support in one platform.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Product</h3>
              <ul className="mt-4 space-y-3">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Quick links</h3>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <p>Built for Indian exporters.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
