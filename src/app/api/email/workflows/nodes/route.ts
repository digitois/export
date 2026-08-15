import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok , error as apiError } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const { data, error } = await ctx.supabase
      .from('email_workflow_nodes')
      .insert(body)
      .select()
      .single();

    if (error) {
      return apiError(error.message, 400);
    }

    return ok({ data });
  } catch (err) {
    return handleApiError(err);
  }
}