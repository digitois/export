import { requireAuth, handleApiError, ok } from '@/lib/api';
import { listNotifications, getUnreadCount } from '@/lib/services/notifications';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const { items } = await listNotifications(ctx.supabase, ctx.userId, { unreadOnly, limit: 30 });
    const { count } = await getUnreadCount(ctx.supabase, ctx.userId);

    return ok({ items, unreadCount: count });
  } catch (err) {
    return handleApiError(err);
  }
}
