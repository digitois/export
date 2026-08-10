import { requireAuth, handleApiError, ok } from '@/lib/api';
import { markAllRead, markRead } from '@/lib/services/notifications';

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    if (body.all) {
      const { error } = await markAllRead(ctx.supabase, ctx.userId);
      if (error) return ok({ error: error.message }, { status: 400 });
    } else if (body.id) {
      const { error } = await markRead(ctx.supabase, ctx.userId, body.id);
      if (error) return ok({ error: error.message }, { status: 400 });
    }

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
