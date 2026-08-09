'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, MailWarning, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { Loading } from '@/components/loading';

type Phase = 'checking' | 'needs-auth' | 'accepting' | 'success' | 'error';

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('');

  const acceptWithSession = useCallback(async () => {
    setPhase('accepting');
    try {
      await api('/api/team/accept-invite', { method: 'POST', body: { token } });
      setPhase('success');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'This invitation could not be accepted.');
      setPhase('error');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setMessage('This invitation link is missing its token.');
      setPhase('error');
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setPhase('needs-auth');
        return;
      }
      await acceptWithSession();
    })();
    return () => {
      cancelled = true;
    };
  }, [token, acceptWithSession]);

  // Preserve the invite so login/signup can return the user here.
  const nextPath = `/accept-invite?token=${encodeURIComponent(token)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Team invitation</CardTitle>
        <CardDescription>Join your team on Export OS</CardDescription>
      </CardHeader>
      <CardContent>
        {phase === 'checking' && <Loading label="Checking your invitation..." />}

        {phase === 'accepting' && <Loading label="Accepting invitation..." />}

        {phase === 'needs-auth' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sign in or create your account to accept this invitation. You&apos;ll be brought right back
              here.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button asChild className="w-full">
                <Link href={loginHref}>Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={signupHref}>Create an account</Link>
              </Button>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ve joined the team. Welcome aboard!
            </p>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <MailWarning className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <Logo />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Suspense fallback={<Loading label="Loading invitation..." />}>
            <AcceptInviteInner />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
