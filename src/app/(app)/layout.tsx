import { redirect } from 'next/navigation';
import { getCurrentUser, getProfile, getOrgContext } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { UserNav } from '@/components/dashboard/user-nav';
import { OrgSwitcher } from '@/components/org/org-switcher';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, org] = await Promise.all([getCurrentUser(), getProfile(), getOrgContext()]);

  if (!user) redirect('/login');
  if (!org.context) redirect('/onboarding');

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <Sidebar
          organizationName={org.context.organizationName}
          isSuperAdmin={profile?.is_platform_admin ?? false}
        />
      </aside>
      <div className="flex min-h-screen w-full flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-background/85 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav
              organizationName={org.context.organizationName}
              isSuperAdmin={profile?.is_platform_admin ?? false}
            />
            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
            <div className="md:hidden">
              <span className="font-display text-sm font-semibold">{org.context.organizationName}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <OrgSwitcher currentOrgId={org.context.organizationId} onSwitch={() => window.location.reload()} />
            <NotificationBell />
            <UserNav
              user={{
                id: user.id,
                email: user.email ?? '',
                fullName: profile?.full_name ?? 'User',
                avatarUrl: profile?.avatar_url
              }}
            />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
