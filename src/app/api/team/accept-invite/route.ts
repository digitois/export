import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitation } from '@/lib/services/organizations';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token) return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const supabase = await createClient();
    const result = await acceptInvitation(supabase, token, user.id, user.email ?? '');

    if (result.error) return NextResponse.json({ error: result.error instanceof Error ? result.error.message : 'Failed to accept invitation' }, { status: 400 });
    return NextResponse.json({ data: { organizationId: result.data?.organizationId } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
