import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, ok } from '@/lib/api';

// Basic template CRUD - can be enhanced with full service layer
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { data, error } = await ctx.supabase
      .from('email_templates_enhanced')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return ok({ error: error.message }, { status: 400 });
    }

    return ok({ data: data ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const { data, error } = await ctx.supabase
      .from('email_templates_enhanced')
      .insert({
        ...body,
        organization_id: ctx.organizationId,
        created_by: ctx.userId
      })
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