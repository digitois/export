import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { announcementSchema } from '@/lib/validations';
import { listAnnouncements, createAnnouncement } from '@/lib/services/admin';
import { camelToSnakeObject } from '@/lib/utils';

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const data = await listAnnouncements(ctx.supabase);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const body = await request.json();
    const parsed = announcementSchema.parse(body);

    const payload: Record<string, unknown> = {
      ...camelToSnakeObject(parsed as unknown as Record<string, unknown>),
      created_by: ctx.userId
    };

    const { data, error } = await createAnnouncement(ctx.supabase, payload);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}