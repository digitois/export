import { requireAuth, handleApiError, ok } from '@/lib/api';
import { uploadFile, getPublicUrl, STORAGE_BUCKETS } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) ?? 'company';

    if (!file) return ok({ error: 'No file provided' }, { status: 400 });

    const bucketKey = (STORAGE_BUCKETS[bucket as keyof typeof STORAGE_BUCKETS] ?? STORAGE_BUCKETS.company) as
      (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

    const buffer = Buffer.from(await file.arrayBuffer());
    const { path } = await uploadFile(ctx.organizationId, bucketKey, file.name, buffer, file.type);
    const url = await getPublicUrl(bucketKey, path);

    return ok({ path, url });
  } catch (err) {
    return handleApiError(err);
  }
}
