import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok , error as apiError } from '@/lib/api';
import {
  createImportJob, getImportJob, listImportJobs, getImportErrors,
  updateImportJob, processImport
} from '@/lib/services/contact-import';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const errors = searchParams.get('errors') === 'true';

    if (jobId) {
      if (errors) {
        const { data, error } = await getImportErrors(ctx.supabase, ctx.organizationId, jobId);
        if (error) return apiError(error.message, 400);
        return ok(data);
      }
      const { data, error } = await getImportJob(ctx.supabase, ctx.organizationId, jobId);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    const { data, error } = await listImportJobs(ctx.supabase, ctx.organizationId);
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

    if (action === 'create-job') {
      const { data, error } = await createImportJob(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (action === 'run') {
      // body.contacts is the validated list from CSV parsing; listId optional
      const { data: job } = await createImportJob(ctx.supabase, ctx.organizationId, ctx.userId, {
        list_id: body.listId ?? null,
        filename: body.filename ?? 'contacts.csv',
        total_rows: body.contacts?.length ?? 0,
        column_mapping: body.columnMapping ?? {}
      });
      if (!job) return apiError('Failed to create import job', 400);

      const result = await processImport(
        ctx.supabase,
        ctx.organizationId,
        job.id,
        body.contacts ?? [],
        body.listId
      );

      return ok({ job, ...result });
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

    const { data, error } = await updateImportJob(ctx.supabase, ctx.organizationId, body.id, body.updates);
    if (error) return apiError(error.message, 400);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
