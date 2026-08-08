import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { z } from 'zod';
import { importBuyers } from '@/lib/services/buyers';
import { parseCsv } from '@/lib/csv';

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const schema = z.object({
        rows: z.array(z.record(z.string()))
      });
      const parsed = schema.parse(body);
      const { error } = await importBuyers(ctx.supabase, ctx.organizationId, ctx.userId, parsed.rows);
      if (error) return ok({ error: error.message }, { status: 400 });

      await writeAudit(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'import_buyers',
        entityType: 'buyer',
        meta: { count: parsed.rows.length },
        ip: getIp(request)
      });

      return ok({ imported: parsed.rows.length });
    }

    const text = await request.text();
    const rows = parseCsv(text);
    if (rows.length === 0) return ok({ error: 'No rows found in the CSV file' }, { status: 400 });

    const { error } = await importBuyers(ctx.supabase, ctx.organizationId, ctx.userId, rows);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'import_buyers',
      entityType: 'buyer',
      meta: { count: rows.length },
      ip: getIp(request)
    });

    return ok({ imported: rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}
