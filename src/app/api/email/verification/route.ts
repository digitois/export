import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  localCheckEmail, verifyEmail, startBulkVerify,
  getBulkVerifyStatus, getVerificationStats, loadDisposableDomains, getDisposableDomains
} from '@/lib/services/email-verification';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const scope = searchParams.get('scope');

    if (jobId) {
      const { data, error } = await getBulkVerifyStatus(ctx.supabase, jobId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (scope === 'stats') {
      const { data, error } = await getVerificationStats(ctx.supabase, ctx.organizationId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (scope === 'disposable') {
      const { data, error } = await getDisposableDomains(ctx.supabase);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    return ok([]);
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

    if (action === 'local-check') {
      const data = await localCheckEmail(body.email ?? '');
      return ok(data);
    }

    if (action === 'check') {
      const data = await verifyEmail(body.email ?? '', body.provider ?? 'reoon');
      return ok(data);
    }

    if (action === 'bulk-verify') {
      const { data, error } = await startBulkVerify(
        ctx.supabase,
        ctx.organizationId,
        ctx.userId,
        body.listId,
        body.provider ?? 'local'
      );
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (action === 'load-disposable') {
      const { error } = await loadDisposableDomains(ctx.supabase);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ success: true });
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
