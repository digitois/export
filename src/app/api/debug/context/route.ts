import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  const membershipsQuery = user
    ? await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, plan_id, plans(code))')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
    : { data: null, error: null };

  return Response.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    user,
    userError: userError?.message ?? null,
    memberships: membershipsQuery.data,
    membershipsError: membershipsQuery.error?.message ?? null,
    memberCount: (membershipsQuery.data as unknown[])?.length ?? null
  });
}