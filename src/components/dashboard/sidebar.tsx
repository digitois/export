'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ReceiptText, FileText, Package, Contact,
  Folder, Newspaper, Sparkles, Send, BarChart3, Globe, Building2,
  UserCog, Settings, SearchCode, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/quotations', label: 'Quotations', icon: ReceiptText },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/buyers', label: 'Buyers', icon: Contact },
  { href: '/documents', label: 'Documents', icon: Folder },
  { href: '/blog', label: 'Blog', icon: Newspaper },
  { href: '/hsn', label: 'HSN Search', icon: SearchCode },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/email', label: 'Email Marketing', icon: Send },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/website', label: 'Website', icon: Globe },
  { href: '/company', label: 'Company Profile', icon: Building2 },
  { href: '/team', label: 'Team', icon: UserCog },
  { href: '/settings', label: 'Settings', icon: Settings }
];

interface SidebarProps {
  organizationName: string;
  isSuperAdmin?: boolean;
}

export function Sidebar({ organizationName, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-4 py-3">
        <p className="truncate rounded-md bg-muted px-3 py-2 text-sm font-medium">{organizationName}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {NAV.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isSuperAdmin && (
        <div className="border-t p-3">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </Link>
        </div>
      )}
    </div>
  );
}
