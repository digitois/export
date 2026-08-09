import { requireAuth, handleApiError, requireRole, ok, writeAudit, getIp } from '@/lib/api';
import {
  listTeamMembers,
  updateMemberRole,
  removeMember,
  revokeInvitation
} from '@/lib/services/organizations';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { items, error } = await listTeamMembers(ctx.supabase, ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(items);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'admin');

    const body = await request.json();
    const { id, role } = body as { id?: string; role?: string };

    if (!id || !role) return ok(null, { status: 400 });
    if (role === 'owner') {
      return ok({ error: 'Owner role cannot be reassigned.' }, { status: 400 });
    }

    const { data, error } = await updateMemberRole(ctx.supabase, ctx.organizationId, id, role);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_member_role',
      entityType: 'organization_member',
      entityId: id,
      meta: { role },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'admin');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const kind = searchParams.get('kind') ?? 'member';

    if (!id) return ok({ error: 'Missing id' }, { status: 400 });

    if (kind === 'invitation') {
      const { error } = await revokeInvitation(ctx.supabase, ctx.organizationId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
    } else {
      const { error } = await removeMember(ctx.supabase, ctx.organizationId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
    }

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: kind === 'invitation' ? 'revoke_invitation' : 'remove_member',
      entityType: kind,
      entityId: id,
      ip: getIp(request)
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
