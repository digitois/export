import { cache } from 'react';
import 'server-only';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

export interface OrgContext {
  organizationId: string;
  role: 'owner' | 'admin' | 'manager' | 'employee';
  organizationName: string;
  planCode: string | null;
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
});

export const getOrgContext = cache(
  async (): Promise<{ context: OrgContext | null; error: Error | null }> => {
    const user = await getCurrentUser();
    if (!user) return { context: null, error: new Error('UNAUTHENTICATED') };

    const supabase = await createSupabaseClient();
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, plan_id, plans(code))')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    const membership = memberships?.[0];
    if (!membership) return { context: null, error: new Error('NO_ORGANIZATION') };

    const org = membership.organizations as unknown as
      | { id: string; name: string; plan_id: string | null; plans: { code: string } | null }
      | null;

    return {
      context: {
        organizationId: membership.organization_id,
        role: membership.role as OrgContext['role'],
        organizationName: org?.name ?? 'My Organization',
        planCode: org?.plans?.code ?? null
      },
      error: null
    };
  }
);
