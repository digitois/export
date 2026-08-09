import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD'
): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', options).format(d);
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

export function truncate(str: string, length = 60): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function toSnakeCase(input: string): string {
  return input.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function toCamelCase(input: string): string {
  return input.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function snakeToCamelObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[toCamelCase(key)] = value;
  }
  return out;
}

export function camelToSnakeObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[toSnakeCase(key)] = value;
  }
  return out;
}

/**
 * Validate a `next`/redirect query param so it can only point back to a path on
 * this site (prevents open-redirect abuse). Returns the fallback when unsafe.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  // Must be a relative path, not a protocol-relative (`//host`) or absolute URL.
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function parsePagination(searchParams: Record<string, string | undefined>) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.pageSize ?? 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export function getQuery(searchParams: Record<string, string | undefined>) {
  return (searchParams.q ?? '').trim();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
