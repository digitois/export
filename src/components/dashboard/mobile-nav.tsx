'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/sidebar';

interface MobileNavProps {
  organizationName: string;
  isSuperAdmin?: boolean;
}

export function MobileNav({ organizationName, isSuperAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted-foreground transition-colors hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative z-10 flex h-full">
            <Sidebar organizationName={organizationName} isSuperAdmin={isSuperAdmin} />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center self-start rounded-lg text-white/90 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
