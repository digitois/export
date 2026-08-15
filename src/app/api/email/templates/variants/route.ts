import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import {
  listVariants, createVariant, listBlocks, createBlock,
  updateBlock, deleteBlock, reorderBlocks, getTemplateWithBlocks
} from '@/lib/services/templates';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const withBlocks = searchParams.get('withBlocks') === 'true';

    if (templateId && withBlocks) {
      const { data, error } = await getTemplateWithBlocks(ctx.supabase, ctx.organizationId, templateId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (templateId) {
      const { data, error } = await listVariants(ctx.supabase, ctx.organizationId, templateId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data ?? []);
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

    if (action === 'create-variant') {
      const { data, error } = await createVariant(
        ctx.supabase,
        ctx.organizationId,
        ctx.userId,
        body.parentTemplateId,
        body.input
      );
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (action === 'create-block') {
      const { data, error } = await createBlock(ctx.supabase, body.templateId, body.input);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    if (action === 'reorder-blocks') {
      const { error } = await reorderBlocks(ctx.supabase, body.templateId, body.blockIds);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok({ success: true });
    }

    if (action === 'list-blocks') {
      const { data, error } = await listBlocks(ctx.supabase, body.templateId);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data ?? []);
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
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

    if (action === 'update-block') {
      const { data, error } = await updateBlock(ctx.supabase, body.blockId, body.updates);
      if (error) return ok({ error: error.message }, { status: 400 });
      return ok(data);
    }

    return ok({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');
    if (!blockId) return ok({ error: 'Block id required' }, { status: 400 });

    const { error } = await deleteBlock(ctx.supabase, blockId);
    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
