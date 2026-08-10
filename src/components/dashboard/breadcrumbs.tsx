'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getNavLabel } from '@/components/dashboard/sidebar';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/admin': 'Admin Panel',
  '/onboarding': 'Onboarding',
  '/login': 'Login',
  '/signup': 'Sign up',
  '/verify': 'Verify'
};

export function Breadcrumbs() {
  const pathname = usePathname();

  if (TITLES[pathname]) return null;

  const label = getNavLabel(pathname);
  if (!label) return null;

  // If the current path maps directly to a known nav label (e.g. /hrm/attendance
  // -> Attendance), show Home > Label only. Otherwise show the module parent.
  const segments = pathname.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1].replace(/-/g, ' ');
  const showLeaf = leaf.toLowerCase() !== label.toLowerCase() && label !== null;

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
      <Link href="/dashboard" className="transition-colors hover:text-foreground">Home</Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      {showLeaf ? (
        <>
          <span className="font-medium text-foreground">{label}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="capitalize text-muted-foreground">{leaf}</span>
        </>
      ) : (
        <span className="font-medium text-foreground">{label}</span>
      )}
    </nav>
  );
}
