import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import 'server-only';

export const STORAGE_BUCKETS = {
  company: 'company',
  products: 'products',
  documents: 'documents',
  leads: 'leads',
  blog: 'blog',
  generated: 'generated'
} as const;

export type BucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'webm',
  'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'zip'
]);

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function validateUpload(fileName: string, fileSize: number) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new StorageError(`File type .${ext} is not allowed`);
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new StorageError('File is larger than the 20 MB limit');
  }
}

export function buildStoragePath(organizationId: string, bucket: BucketName, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]/g, '_');
  return `${organizationId}/${Date.now()}-${safeName}`;
}

/**
 * Upload a file to the org-scoped storage path using the service role,
 * ensuring tenants can never access another tenant's files.
 */
export async function uploadFile(
  organizationId: string,
  bucket: BucketName,
  fileName: string,
  buffer: Buffer,
  mimeType?: string
): Promise<{ path: string; size: number }> {
  validateUpload(fileName, buffer.length);

  const supabase = await createSupabaseClient();
  const path = buildStoragePath(organizationId, bucket, fileName);

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mimeType ?? undefined,
    upsert: false
  });

  if (error) {
    throw new StorageError(`Upload failed: ${error.message}`);
  }

  return { path, size: buffer.length };
}

export async function getPublicUrl(bucket: BucketName, path: string): Promise<string> {
  const supabase = await createSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: BucketName, path: string) {
  const supabase = await createSupabaseClient();
  await supabase.storage.from(bucket).remove([path]);
}
