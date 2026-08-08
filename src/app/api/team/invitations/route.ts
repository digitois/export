import { NextResponse } from 'next/server';
import { requireAuth, handleApiError, requireRole, ok, writeAudit, getIp } from '@/lib/api';
import { inviteMemberSchema } from '@/lib/validations';
import { inviteMember } from '@/lib/services/organizations';
import { sendEmail, emailLayout, isSesConfigured } from '@/lib/email';

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data } = await ctx.supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false });
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, 'admin');

    const body = await request.json();
    const parsed = inviteMemberSchema.parse(body);

    const { data, error, token } = await inviteMember(
      ctx.supabase,
      ctx.organizationId,
      ctx.userId,
      { email: parsed.email, role: parsed.role }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const acceptUrl = `${appUrl}/accept-invite?token=${token}`;

    if (isSesConfigured()) {
      await sendEmail({
        to: parsed.email,
        subject: `You've been invited to join ${ctx.organizationName} on Export OS`,
        html: emailLayout(
          'You are invited',
          `<p>You have been invited to join <strong>${ctx.organizationName}</strong> on Export OS with the role of <strong>${parsed.role}</strong>.</p>
           <p style="margin:20px 0"><a href="${acceptUrl}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Accept invitation</a></p>
           <p>This link expires in 7 days.</p>`
        )
      });
    }

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'invite_member',
      entityType: 'invitation',
      entityId: data?.id,
      meta: { email: parsed.email, role: parsed.role },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
