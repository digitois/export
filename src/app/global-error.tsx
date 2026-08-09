'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global] fatal error', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1rem',
          textAlign: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: '#F7F8FA',
          color: '#0F172A'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: '28rem', color: '#64748B', margin: 0, fontSize: '0.875rem' }}>
          The application hit a fatal error. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            appearance: 'none',
            border: 0,
            borderRadius: '0.5rem',
            background: '#1E6F5C',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>Reference: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
