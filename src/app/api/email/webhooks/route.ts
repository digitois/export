import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok , error as apiError } from '@/lib/api';
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
      if (endpointRes.error) return apiError(endpointRes.error.message, 400);
      return ok({ ...endpointRes.data, deliveries: deliveriesRes.data });
    }

    if (id) {
      const { data, error } = await getWebhookEndpoint(ctx.supabase, ctx.organizationId, id);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    const { data, error } = await listWebhookEndpoints(ctx.supabase, ctx.organizationId);
    if (error) return apiError(error.message, 400);
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
      const { data, error } = await createWebhookEndpoint(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (action === 'test') {
      const { data, error } = await testWebhookEndpoint(ctx.supabase, ctx.organizationId, body.endpointId);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    return apiError('Unknown action', 400);
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
    if (error) return apiError(error.message, 400);
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
    if (!id) return apiError('Webhook endpoint id required', 400);

    const { error } = await deleteWebhookEndpoint(ctx.supabase, ctx.organizationId, id);
    if (error) return apiError(error.message, 400);
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
