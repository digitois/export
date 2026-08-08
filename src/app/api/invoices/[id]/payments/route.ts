import { requireAuth, handleApiError, ok } from '@/lib/api';
import { z } from 'zod';
import { recordInvoicePayment } from '@/lib/services/invoices';

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  currency: z.string().length(3).default('USD'),
  paymentDate: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.parse(body);

    const { data, error } = await recordInvoicePayment(ctx.supabase, ctx.organizationId, ctx.userId, id, {
      amount: parsed.amount,
      currency: parsed.currency,
      paymentDate: parsed.paymentDate ?? undefined,
      method: parsed.method ?? undefined,
      reference: parsed.reference ?? undefined,
      notes: parsed.notes ?? undefined
    });
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
