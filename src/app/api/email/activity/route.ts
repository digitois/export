import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';
import {
  logEmailActivity, getActivityLog, getContactTimeline,
  getActivityStats, checkSuppression
} from '@/lib/services/email-activity';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const scope = searchParams.get('scope');

    if (contactId) {
      const { data, error } = await getContactTimeline(ctx.supabase, ctx.organizationId, contactId);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (scope === 'stats') {
      const { data, error } = await getActivityStats(
        ctx.supabase,
        ctx.organizationId,
        searchParams.get('dateFrom') ?? undefined,
        searchParams.get('dateTo') ?? undefined
      );
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (scope === 'suppression') {
      const { data, error } = await checkSuppression(ctx.supabase, ctx.organizationId, searchParams.get('email') ?? '');
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    const { data, count, error } = await getActivityLog(ctx.supabase, {
      organization_id: ctx.organizationId,
      event: (searchParams.get('event') as Parameters<typeof getActivityLog>[1]['event']) ?? undefined,
      contact_id: searchParams.get('contact_id') ?? undefined,
      template_id: searchParams.get('template_id') ?? undefined,
      campaign_id: searchParams.get('campaign_id') ?? undefined,
      sequence_id: searchParams.get('sequence_id') ?? undefined,
      date_from: searchParams.get('date_from') ?? undefined,
      date_to: searchParams.get('date_to') ?? undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined
    });
    if (error) return apiError(error.message, 400);
    return ok({ items: data ?? [], count: count ?? 0 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const { action } = body;

    if (action === 'log') {
      const { data, error } = await logEmailActivity(ctx.supabase, {
        ...body.input,
        organization_id: ctx.organizationId
      });
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    return apiError('Unknown action', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
