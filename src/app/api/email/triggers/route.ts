import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  createTrigger, getTrigger, listTriggers, updateTrigger, deleteTrigger,
  getTriggerStats, listTriggerEvaluations, fireTrigger
} from '@/lib/services/triggers';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const [triggerRes, statsRes, evaluationsRes] = await Promise.all([
        getTrigger(ctx.supabase, ctx.organizationId, id),
        getTriggerStats(ctx.supabase, ctx.organizationId, id),
        listTriggerEvaluations(ctx.supabase, ctx.organizationId, id)
      ]);
      if (triggerRes.error) return ok({ error: triggerRes.error.message }, { status: 400 });
      return ok({
        ...triggerRes.data,
        stats: statsRes.data,
        evaluations: evaluationsRes.data
      });
    }

    const { data, error } = await listTriggers(ctx.supabase, ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { data, error } = await createTrigger(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (action === 'fire') {
      const { data } = await fireTrigger(
        ctx.supabase,
        ctx.organizationId,
        body.eventType,
        body.contactId,
        body.leadId,
        body.eventData ?? {}
      );
      return ok(data);
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const body = await request.json();

    const { data, error } = await updateTrigger(ctx.supabase, ctx.organizationId, body.id, body.updates);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return ok({ error: 'Trigger id required' }, { status: 400 });

    const { error } = await deleteTrigger(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
