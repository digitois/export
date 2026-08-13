import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const { data, error } = await ctx.supabase
      .from('email_workflow_edges')
      .insert(body)
      .select()
      .single();

    if (error) {
      return ok({ error: error.message }, { status: 400 });
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}