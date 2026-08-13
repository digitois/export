import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getWorkflow, updateWorkflow, deleteWorkflow, getWorkflowWithNodes, triggerWorkflow } from '@/lib/services/email-workflows';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeNodes = searchParams.get('include_nodes') === 'true';

    if (includeNodes) {
      const { data, error } = await getWorkflowWithNodes(ctx.supabase, ctx.organizationId, id);
      
      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data });
    }

    const { data, error } = await getWorkflow(ctx.supabase, ctx.organizationId, id);
    
    if (error) {
      return ok({ error: error.message }, { status: 404 });
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await updateWorkflow(
      ctx.supabase,
      ctx.organizationId,
      id,
      body
    );

    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error).message;
      return ok({ error: errorMessage }, { status: 400 });
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { error } = await deleteWorkflow(ctx.supabase, ctx.organizationId, id);

    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error).message;
      return ok({ error: errorMessage }, { status: 400 });
    }

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// Separate endpoint for triggering workflows
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { action, triggerData } = body;

    if (action === 'trigger') {
      const { data, error } = await triggerWorkflow(
        ctx.supabase,
        ctx.organizationId,
        id,
        triggerData || {}
      );

      if (error) {
        return ok({ error: error.message }, { status: 400 });
      }

      return ok({ data });
    }

    return ok({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}