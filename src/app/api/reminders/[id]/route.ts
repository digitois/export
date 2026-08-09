import { requireAuth, handleApiError, ok } from '@/lib/api';
import { listReminders, getReminder, markReminderRead, dismissReminder, deleteReminder } from '@/lib/services/reminders';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getReminder(ctx.supabase, ctx.userId, id);
    if (error || !data) return ok({ error: 'Reminder not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (body.read === true && Object.keys(body).length === 1) {
      const { data, error } = await markReminderRead(ctx.supabase, ctx.userId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (body.dismiss === true && Object.keys(body).length === 1) {
      const { data, error } = await dismissReminder(ctx.supabase, ctx.userId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    // Fallback: try to update (though we don't have a full update function yet)
    return ok({ error: 'Use read/dismiss actions' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteReminder(ctx.supabase, ctx.userId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}