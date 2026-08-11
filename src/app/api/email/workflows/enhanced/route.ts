import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { createWorkflow, listWorkflows, getWorkflow, updateWorkflow, deleteWorkflow, getWorkflowWithNodes } from '@/lib/services/email-workflows';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active_only') === 'true';

  const { data, error } = await listWorkflows(auth.supabase, auth.organizationId, activeOnly);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  const { data, error } = await createWorkflow(
    auth.supabase,
    auth.organizationId,
    auth.user.id,
    body
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}