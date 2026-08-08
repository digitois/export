'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your inbox';

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 rounded-full bg-muted p-3">
          <MailCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
          Click the link in the email to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Go to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
