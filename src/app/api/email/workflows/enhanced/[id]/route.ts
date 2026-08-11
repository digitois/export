import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getWorkflow, updateWorkflow, deleteWorkflow, getWorkflowWithNodes, triggerWorkflow } from '@/lib/services/email-workflows';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const includeNodes = searchParams.get('include_nodes') === 'true';

  if (includeNodes) {
    const { data, error } = await getWorkflowWithNodes(auth.supabase, auth.organizationId, params.id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  const { data, error } = await getWorkflow(auth.supabase, auth.organizationId, params.id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  const { data, error } = await updateWorkflow(
    auth.supabase,
    auth.organizationId,
    params.id,
    body
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { error } = await deleteWorkflow(auth.supabase, auth.organizationId, params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// Separate endpoint for triggering workflows
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { action, triggerData } = body;

  if (action === 'trigger') {
    const { data, error } = await triggerWorkflow(
      auth.supabase,
      auth.organizationId,
      params.id,
      triggerData || {}
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}