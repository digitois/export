import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { certificateOfOriginSchema, paginationSchema } from '@/lib/validations';
import { listCertificatesOfOrigin, createCertificateOfOrigin } from '@/lib/services/certificates';
import { getNextSequence } from '@/lib/services/sequences';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    const { items, count } = await listCertificatesOfOrigin(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      type: params.type
    });

    return paginated(items, count, parsed.page, parsed.pageSize);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = certificateOfOriginSchema.parse(body);

    const cooNumber = await getNextSequence(ctx.supabase, ctx.organizationId, 'COO');

    const { data, error } = await createCertificateOfOrigin(ctx.supabase, ctx.organizationId, ctx.userId, cooNumber, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_certificate_of_origin',
      entityType: 'certificate_of_origin',
      entityId: data?.id,
      meta: { number: cooNumber },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
