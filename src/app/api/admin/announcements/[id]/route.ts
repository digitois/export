import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { updateAnnouncement, deleteAnnouncement } from '@/lib/services/admin';
import { camelToSnakeObject } from '@/lib/utils';

function cleanPayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) out[key] = value;
  }
  return camelToSnakeObject(out);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const payload = cleanPayload(body as Record<string, unknown>);

    const { data, error } = await updateAnnouncement(ctx.supabase, id, payload);
    if (error) return ok({ error: error.message }, { status: 400 });
    if (!data) return ok({ error: 'Announcement not found' }, { status: 404 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;

    const { error } = await deleteAnnouncement(ctx.supabase, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}