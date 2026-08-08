import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { paginationSchema } from '@/lib/validations';
import { listDocuments, createDocument } from '@/lib/services/documents';
import { uploadFile } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listDocuments(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      type: params.type,
      folderId: params.folderId
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = String(formData.get('name') ?? '');
    const documentType = String(formData.get('documentType') ?? 'other');
    const description = (formData.get('description') as string) || null;
    const folderId = (formData.get('folderId') as string) || null;

    if (!file) return ok({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { path, size } = await uploadFile(ctx.organizationId, 'documents', file.name, buffer, file.type);

    const { data, error } = await createDocument(ctx.supabase, ctx.organizationId, ctx.userId, {
      name: name || file.name,
      documentType,
      description,
      folderId,
      storagePath: path,
      fileSize: size,
      mimeType: file.type
    });

    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'upload_document',
      entityType: 'document',
      entityId: data?.id,
      meta: { name: name || file.name, size },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
