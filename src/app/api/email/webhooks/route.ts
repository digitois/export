import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  createWebhookEndpoint, getWebhookEndpoint, listWebhookEndpoints,
  updateWebhookEndpoint, deleteWebhookEndpoint, testWebhookEndpoint, listWebhookDeliveries
} from '@/lib/services/webhooks';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const showDeliveries = searchParams.get('deliveries') === 'true';

    if (id && showDeliveries) {
      const [endpointRes, deliveriesRes] = await Promise.all([
        getWebhookEndpoint(ctx.supabase, ctx.organizationId, id),
        listWebhookDeliveries(ctx.supabase, ctx.organizationId, id)
      ]);
      if (endpointRes.error) return ok({ error: endpointRes.error.message }, { status: 400 });
      return ok({ data: { ...endpointRes.data, deliveries: deliveriesRes.data } });
    }

    if (id) {
      const { data, error } = await getWebhookEndpoint(ctx.supabase, ctx.organizationId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ data });
    }

    const { data, error } = await listWebhookEndpoints(ctx.supabase, ctx.organizationId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ data: data ?? [] });
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
      const { data, error } = await createWebhookEndpoint(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ data });
    }

    if (action === 'test') {
      const { data, error } = await testWebhookEndpoint(ctx.supabase, ctx.organizationId, body.endpointId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ data });
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

    const { data, error } = await updateWebhookEndpoint(ctx.supabase, ctx.organizationId, body.id, body.updates);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ data });
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
    if (!id) return ok({ error: 'Webhook endpoint id required' }, { status: 400 });

    const { error } = await deleteWebhookEndpoint(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ data: true });
  } catch (err) {
    return handleApiError(err);
  }
}