import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { Logo } from '@/components/logo';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <div className="flex h-full w-64 flex-col border-r bg-background">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo />
            </Link>
          </div>
          <div className="px-4 py-3">
            <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Platform Admin
            </p>
          </div>
          <AdminNav />
        </div>
      </aside>
      <div className="flex min-h-screen w-full flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <p className="text-sm font-semibold">Master Admin</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}