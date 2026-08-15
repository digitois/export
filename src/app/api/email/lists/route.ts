import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';
import { contactListSchema } from '@/lib/validations';
import { listContactLists, createContactList } from '@/lib/services/email';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const lists = await listContactLists(ctx.supabase, ctx.organizationId);
    return ok(lists);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = contactListSchema.parse(body);
    const { data, error } = await createContactList(ctx.supabase, ctx.organizationId, ctx.userId, parsed.name, parsed.description ?? undefined);
    if (error) return apiError(error.message, 400);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
