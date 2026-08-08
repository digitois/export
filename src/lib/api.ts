import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/rbac';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function paginated<T>(items: T[], count: number, page: number, pageSize: number) {
  return NextResponse.json({
    data: items,
    meta: { count, page, pageSize, totalPages: Math.ceil(count / pageSize) }
  });
}

export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  organizationName: string;
  planCode: string | null;
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>;
}

/**
 * Authenticate the request, resolve the caller's organization membership and
 * return a scoped context. Throws ApiError for unauthenticated / no-org cases.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError('Authentication required', 401);
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, plan_id, plans(code))')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!membership) {
    throw new ApiError('No organization found. Create an organization first.', 403);
  }

  const org = membership.organizations as unknown as
    | { id: string; name: string; plan_id: string | null; plans: { code: string } | null }
    | null;

  return {
    userId: user.id,
    email: user.email ?? '',
    organizationId: membership.organization_id,
    role: membership.role as Role,
    organizationName: org?.name ?? 'My Organization',
    planCode: org?.plans?.code ?? null,
    supabase
  };
}

/**
 * Require a minimum role for the current org membership.
 */
export function requireRole(ctx: AuthContext, required: Role) {
  const order: Record<Role, number> = { owner: 4, admin: 3, manager: 2, employee: 1 };
  if (order[ctx.role] < order[required]) {
    throw new ApiError(`Insufficient permissions. Requires ${required} role or above.`, 403);
  }
}

export async function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return error(err.message, err.status);
  }
  if (err instanceof Error && err.message?.includes('rate limit')) {
    return error(err.message, 429);
  }
  console.error('[api] unhandled error', err);
  return error('Internal server error', 500);
}

export function getIp(request: Request): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

export async function writeAudit(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  args: {
    organizationId: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
    ip?: string | null;
  }
) {
  await supabase.from('audit_logs').insert({
    organization_id: args.organizationId,
    user_id: args.userId ?? undefined,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId ?? undefined,
    meta: args.meta ?? {},
    ip: args.ip ?? undefined
  });
}

export async function logActivity(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  args: {
    organizationId: string;
    userId?: string | null;
    type: string;
    entityType: string;
    entityId?: string | null;
    description: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from('activity_logs').insert({
    organization_id: args.organizationId,
    user_id: args.userId ?? undefined,
    type: args.type,
    entity_type: args.entityType,
    entity_id: args.entityId ?? undefined,
    description: args.description,
    metadata: args.metadata ?? {}
  });
}
