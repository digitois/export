import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';
import { listDocumentFolders, createDocumentFolder } from '@/lib/services/documents';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const folders = await listDocumentFolders(ctx.supabase, ctx.organizationId);
    return ok(folders);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const schema = z.object({ name: z.string().min(1).max(120), parentId: z.string().uuid().optional().nullable() });
    const parsed = schema.parse(body);
    const { data, error } = await createDocumentFolder(ctx.supabase, ctx.organizationId, parsed.name, parsed.parentId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
