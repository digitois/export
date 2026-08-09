'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[root] route error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to your dashboard.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
      {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
