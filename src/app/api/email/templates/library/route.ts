import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  getLibraryTemplates, getLibraryTemplate, createTemplateFromLibrary
} from '@/lib/services/templates';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const { data, error } = await getLibraryTemplate(ctx.supabase, slug);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ data });
    }

    const { data, error } = await getLibraryTemplates(ctx.supabase, searchParams.get('category') ?? undefined);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ data: data ?? [] });
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

    if (action === 'create-from-library') {
      const { data, error } = await createTemplateFromLibrary(
        ctx.supabase,
        ctx.organizationId,
        ctx.userId,
        body.slug,
        body.customName
      );
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ data });
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}