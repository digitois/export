import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { handleApiError, ok } from '@/lib/api';
import { supportReplySchema } from '@/lib/validations';
import { getTicket, setTicketStatus, replyToTicket } from '@/lib/services/admin';

const statusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed'])
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;

    const ticket = await getTicket(ctx.supabase, id);
    if (!ticket) return ok({ error: 'Ticket not found' }, { status: 404 });
    return ok(ticket);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.parse(body);

    const { data, error } = await setTicketStatus(ctx.supabase, id, parsed.status);
    if (error) return ok({ error: error.message }, { status: 400 });
    if (!data) return ok({ error: 'Ticket not found' }, { status: 404 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = supportReplySchema.parse(body);

    const existing = await getTicket(ctx.supabase, id);
    if (!existing) return ok({ error: 'Ticket not found' }, { status: 404 });

    const { data, error } = await replyToTicket(ctx.supabase, id, ctx.userId, parsed.body, true);
    if (error) return ok({ error: error.message }, { status: 400 });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}