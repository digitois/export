'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ReceiptText, FileText, Package, Contact,
  Folder, Newspaper, Sparkles, Send, BarChart3, Globe, Building2,
  UserCog, Settings, SearchCode, Ship, Calculator, PackageCheck, Award,
  Wallet, Warehouse, Truck, Package2, Target, FilePen, Bell, Briefcase,
  CalendarCheck, CalendarDays, Banknote, CreditCard, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    label: 'Sales & CRM',
    items: [
      { href: '/leads', label: 'Leads', icon: Users },
      { href: '/crm', label: 'CRM Pipeline', icon: Target },
      { href: '/follow-ups', label: 'Follow-ups', icon: FilePen },
      { href: '/reminders', label: 'Reminders', icon: Bell },
      { href: '/contracts', label: 'Contracts', icon: FilePen },
      { href: '/quotations', label: 'Quotations', icon: ReceiptText },
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/buyers', label: 'Buyers', icon: Contact }
    ]
  },
  {
    label: 'Trade & Logistics',
    items: [
      { href: '/shipments', label: 'Shipments', icon: Ship },
      { href: '/landed-cost', label: 'Landed Cost', icon: Calculator },
      { href: '/packing-lists', label: 'Packing Lists', icon: PackageCheck },
      { href: '/certificates-of-origin', label: 'CoO', icon: Award }
    ]
  },
  {
    label: 'Operations',
    items: [
      { href: '/finance', label: 'Finance', icon: Wallet },
      { href: '/inventory', label: 'Inventory', icon: Warehouse },
      { href: '/warehouses', label: 'Warehouses', icon: Package2 },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: Package },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/documents', label: 'Documents', icon: Folder },
      { href: '/hsn', label: 'HSN Search', icon: SearchCode }
    ]
  },
  {
    label: 'Team & HR',
    items: [
      { href: '/hrm', label: 'HRM', icon: Briefcase },
      { href: '/hrm/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/hrm/leave', label: 'Leave', icon: CalendarDays },
      { href: '/hrm/payroll', label: 'Payroll', icon: Banknote },
      { href: '/team', label: 'Team', icon: UserCog }
    ]
  },
  {
    label: 'Marketing & Growth',
    items: [
      { href: '/blog', label: 'Blog', icon: Newspaper },
      { href: '/email', label: 'Email Marketing', icon: Send },
      { href: '/website', label: 'Website', icon: Globe },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/assistant', label: 'AI Assistant', icon: Sparkles }
    ]
  },
  {
    label: 'Workspace',
    items: [
      { href: '/billing', label: 'Billing & Payments', icon: CreditCard },
      { href: '/company', label: 'Company Profile', icon: Building2 },
      { href: '/settings', label: 'Settings', icon: Settings }
    ]
  }
];

const FLAT_LABELS: Record<string, string> = {};
for (const section of NAV) {
  for (const item of section.items) {
    FLAT_LABELS[item.href] = item.label;
  }
}

export function getNavLabel(pathname: string): string | null {
  if (pathname === '/dashboard') return 'Dashboard';
  if (FLAT_LABELS[pathname]) return FLAT_LABELS[pathname];
  // Detail pages: match the module prefix (/warehouses/abc -> Warehouses)
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 1; i--) {
    const candidate = '/' + segments.slice(0, i).join('/');
    if (FLAT_LABELS[candidate]) return FLAT_LABELS[candidate];
  }
  return null;
}

interface SidebarProps {
  organizationName: string;
  isSuperAdmin?: boolean;
}

export function Sidebar({ organizationName, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.href === '/dashboard') return pathname === '/dashboard';
    // Parent items with sub-routes should only be active on their exact path
    if (item.href === '/hrm') return pathname === '/hrm';
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-line bg-background">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-4 py-3">
        <p className="truncate rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium">{organizationName}</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {NAV.map((section) => (
          <div key={section.label} className="space-y-0.5">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-accent-weak text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {isSuperAdmin && (
        <div className="border-t border-line p-3">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </Link>
        </div>
      )}
    </div>
  );
}
