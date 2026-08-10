'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Globe, Check, Building2, Settings } from 'lucide-react';
import { api, apiData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  white_label_enabled: boolean;
  white_label_accent?: string | null;
  white_label_logo_url?: string | null;
  role: string;
  plan?: { code: string; name: string } | null;
}

interface OrgSwitcherProps {
  currentOrgId: string;
  onSwitch?: () => void;
}

export function OrgSwitcher({ currentOrgId, onSwitch }: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiData<{ data: Organization[]; currentOrganizationId: string }>('/api/org/switch')
      .then((res) => {
        if (cancelled) return;
        setOrgs(res.data);
        const current = res.data.find((o) => o.id === res.currentOrganizationId);
        if (current) setCurrentOrg(current);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSwitch(orgId: string) {
    try {
      await api('/api/org/switch', { method: 'POST', body: { organizationId: orgId } });
      const newOrg = orgs.find((o) => o.id === orgId);
      if (newOrg) setCurrentOrg(newOrg);
      if (onSwitch) onSwitch();
      else window.location.reload();
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="w-8 h-8 animate-pulse bg-muted rounded-full" />;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="h-9 w-9 rounded-full p-0"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {currentOrg?.white_label_logo_url ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentOrg.white_label_logo_url} alt={currentOrg.name} />
            <AvatarFallback>{currentOrg.name.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{currentOrg?.name.charAt(0) ?? 'O'}</AvatarFallback>
          </Avatar>
        )}
        <ChevronDown className="h-4 w-4 ml-1" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-line bg-popover shadow-lg py-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
                  org.id === currentOrgId
                    ? 'bg-accent-weak text-primary'
                    : 'hover:bg-muted/60'
                )}
              >
                {org.white_label_logo_url ? (
                  <img src={org.white_label_logo_url} alt={org.name} className="h-6 w-6 rounded" />
                ) : (
                  <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{org.role}</p>
                </div>
                {org.id === currentOrgId && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
            <hr className="my-2 border-line" />
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted/60"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Organizations</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}