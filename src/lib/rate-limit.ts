import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

interface Bucket {
  hits: Array<{ time: number; tokens: number }>;
}

const buckets = new Map<string, Bucket>();

function cleanup(key: string, bucket: Bucket, windowMs: number) {
  const now = Date.now();
  bucket.hits = bucket.hits.filter((h) => now - h.time < windowMs);
  if (bucket.hits.length === 0) buckets.delete(key);
}

/**
 * Sliding-window token bucket rate limiter, keyed by IP + route.
 * In production this should be replaced with a distributed store (Redis).
 */
export function rateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number } {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60_000;

  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  cleanup(key, bucket, windowMs);

  bucket.hits.push({ time: now, tokens: 1 });
  const tokens = bucket.hits.reduce((sum, h) => sum + h.tokens, 0);
  const success = tokens <= limit;

  return { success, remaining: Math.max(0, limit - tokens) };
}

export function applyRateLimit(request: NextRequest, opts?: { limit?: number; windowMs?: number }) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const route = request.nextUrl.pathname;
  const result = rateLimit(`${ip}:${route}`, opts);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  return null;
}

export function rateLimitByKey(
  key: string,
  opts?: { limit?: number; windowMs?: number }
): { ok: boolean } {
  const { success } = rateLimit(key, opts);
  return { ok: success };
}
