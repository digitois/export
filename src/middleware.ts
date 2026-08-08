import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.nextUrl.hostname;

  const appHost = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : null;
  const baseHost = process.env.NEXT_PUBLIC_SITE_BASE_HOST ?? null;

  // Multi-tenant public websites live on subdomains of NEXT_PUBLIC_SITE_BASE_HOST
  // OR a custom domain mapped via Vercel. Rewrite those requests to /s/<identifier>.
  if (baseHost && host !== appHost && host.endsWith(`.${baseHost}`)) {
    const identifier = host.slice(0, -(baseHost.length + 1));
    const url = request.nextUrl.clone();
    url.pathname = `/s/${identifier}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}