import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';
import { getEmailAnalytics } from '@/lib/services/email-analytics';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get('days') ?? 30), 1), 90);

    const data = await getEmailAnalytics(ctx.supabase, ctx.organizationId, days);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}