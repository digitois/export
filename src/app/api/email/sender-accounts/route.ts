import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok , error as apiError } from '@/lib/api';
import {
  listSenderAccounts, getSenderAccount, createSESAccount, createGmailAccount,
  updateSenderAccount, deleteSenderAccount, verifySenderAccount, getGmailAuthUrl, testSenderAccount
} from '@/lib/services/sender-accounts';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'gmail-auth-url') {
      const { data, error } = await getGmailAuthUrl(ctx.supabase, ctx.organizationId);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (id) {
      const { data, error } = await getSenderAccount(ctx.supabase, ctx.organizationId, id);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    const { data, error } = await listSenderAccounts(ctx.supabase, ctx.organizationId);
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

    if (action === 'ses') {
      const { data, error } = await createSESAccount(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (action === 'gmail') {
      const { data, error } = await createGmailAccount(ctx.supabase, ctx.organizationId, ctx.userId, body.input);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (action === 'test') {
      const { data, error } = await testSenderAccount(ctx.supabase, ctx.organizationId, body.accountId);
      if (error) return apiError(error.message, 400);
      return ok(data);
    }

    if (action === 'verify') {
      const { data, error } = await verifySenderAccount(ctx.supabase, ctx.organizationId, body.accountId);
      if (error) return apiError(error.message, 400);
      return ok(data);
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

    const { data, error } = await updateSenderAccount(ctx.supabase, ctx.organizationId, body.id, body.updates);
    if (error) return apiError(error.message, 400);
    return ok(data);
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
    if (!id) return apiError('Sender account id required', 400);

    const { error } = await deleteSenderAccount(ctx.supabase, ctx.organizationId, id);
    if (error) return apiError(error.message, 400);
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
