import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  createSequence, listSequences, getSequence, updateSequence, deleteSequence,
  addStep, updateStep, removeStep, reorderSteps, listSteps,
  enrollContact, pauseEnrollment, resumeEnrollment, stopEnrollment, listEnrollments
} from '@/lib/services/sequences';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (id) {
      const { data, error } = await getSequence(ctx.supabase, ctx.organizationId, id);
      if (error) return ok({ error: error.message }, { status: 400 });
      const [steps, enrollments] = await Promise.all([
        listSteps(ctx.supabase, id),
        listEnrollments(ctx.supabase, ctx.organizationId, id)
      ]);
      return ok({ ...data, steps: steps.data, enrollments: enrollments.data });
    }

    const { data, error } = await listSequences(ctx.supabase, ctx.organizationId, { activeOnly });
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
    const { action, ...body } = await request.json();

    switch (action) {
      case 'create': {
        const { data, error } = await createSequence(ctx.supabase, ctx.organizationId, ctx.userId, body);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok(data);
      }
      case 'add-step': {
        const { data, error } = await addStep(ctx.supabase, ctx.organizationId, body.sequenceId, body);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok(data);
      }
      case 'enroll': {
        const { data, error } = await enrollContact(ctx.supabase, ctx.organizationId, body.sequenceId, body.contactId, body.leadId);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok(data);
      }
      default:
        return ok({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update': {
        const { data, error } = await updateSequence(ctx.supabase, ctx.organizationId, body.id, body.updates);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok(data);
      }
      case 'update-step': {
        const { data, error } = await updateStep(ctx.supabase, ctx.organizationId, body.stepId, body.updates);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok(data);
      }
      case 'reorder': {
        const { error } = await reorderSteps(ctx.supabase, ctx.organizationId, body.sequenceId, body.stepIds);
        if (error) return ok({ error: error.message }, { status: 400 });
        return ok({ success: true });
      }
      case 'enrollment-action': {
        const { data, error } = await getSequence(ctx.supabase, ctx.organizationId, body.sequenceId);
        if (error) return ok({ error: error.message }, { status: 400 });
        const handler =
          body.op === 'pause' ? pauseEnrollment :
          body.op === 'resume' ? resumeEnrollment :
          body.op === 'stop' ? stopEnrollment : null;
        if (!handler) return ok({ error: 'Unknown enrollment op' }, { status: 400 });
        const result = await handler(ctx.supabase, ctx.organizationId, body.enrollmentId);
        if (result.error) return ok({ error: result.error.message }, { status: 400 });
        return ok(result.data);
      }
      default:
        return ok({ error: 'Unknown action' }, { status: 400 });
    }
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
    const stepId = searchParams.get('stepId');

    if (stepId) {
      const { error } = await removeStep(ctx.supabase, ctx.organizationId, stepId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ success: true });
    }

    if (!id) return ok({ error: 'Sequence id required' }, { status: 400 });
    const { error } = await deleteSequence(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
