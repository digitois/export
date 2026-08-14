import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError, ok } from '@/lib/api';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data, error } = await ctx.supabase
      .from('organization_settings')
      .select('value')
      .eq('organization_id', ctx.organizationId)
      .eq('key', 'email_verification_keys')
      .single();

    if (error && error.code !== 'PGRST116') {
      return ok({ error: error.message }, { status: 400 });
    }

    const raw = data?.value as Record<string, string> | null | undefined;
    return ok({
      configured: {
        reoon: Boolean(raw?.reoon_key && decryptSecret(raw.reoon_key)),
        neverbounce: Boolean(raw?.neverbounce_key && decryptSecret(raw.neverbounce_key))
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'manager');
    const body = await request.json();

    const { data: existing } = await ctx.supabase
      .from('organization_settings')
      .select('value')
      .eq('organization_id', ctx.organizationId)
      .eq('key', 'email_verification_keys')
      .single();

    const current = (existing?.value as Record<string, string> | null) ?? {};
    const value: Record<string, string> = { ...current };

    if (body.reoon_key) value.reoon_key = encryptSecret(body.reoon_key);
    if (body.neverbounce_key) value.neverbounce_key = encryptSecret(body.neverbounce_key);
    if (body.clear_reoon) delete value.reoon_key;
    if (body.clear_neverbounce) delete value.neverbounce_key;

    const { error } = await ctx.supabase
      .from('organization_settings')
      .upsert({
        organization_id: ctx.organizationId,
        key: 'email_verification_keys',
        value
      }, { onConflict: 'organization_id,key' });

    if (error) return ok({ error: error.message }, { status: 400 });
    return ok({ data: true });
  } catch (err) {
    return handleApiError(err);
  }
}