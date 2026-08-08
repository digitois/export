import { requireAuth, handleApiError, ok } from '@/lib/api';
import { emailContactSchema } from '@/lib/validations';
import { listContacts, addContacts } from '@/lib/services/email';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const listId = new URL(request.url).searchParams.get('listId') ?? undefined;
    const contacts = await listContacts(ctx.supabase, ctx.organizationId, listId);
    return ok(contacts);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const contacts = Array.isArray(body) ? body : [body];
    const parsed = contacts.map((c: Record<string, unknown>) => emailContactSchema.parse(c));

    const { data, error } = await addContacts(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
