import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';
import { listTemplates, createTemplate } from '@/lib/services/email';

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body: z.string().min(1)
});

export async function GET() {
  try {
    const ctx = await requireAuth();
    const templates = await listTemplates(ctx.supabase, ctx.organizationId);
    return ok(templates);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = templateSchema.parse(body);
    const { data, error } = await createTemplate(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
