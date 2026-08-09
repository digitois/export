import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api';

export interface AdminContext {
  userId: string;
  email: string;
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>;
}

/**
 * Guard for the master admin panel. Only users whose profile has
 * is_platform_admin = true (see migration 00026) may proceed.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError('Authentication required', 401);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    throw new ApiError('Insufficient permissions. Platform admin access required.', 403);
  }

  return { userId: user.id, email: user.email ?? '', supabase };
}