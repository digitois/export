import { requireAuth, handleApiError, ok, paginated, writeAudit, getIp } from '@/lib/api';
import { buyerSchema, paginationSchema } from '@/lib/validations';
import { listBuyers, createBuyer } from '@/lib/services/buyers';
import { toCsv } from '@/lib/csv';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = paginationSchema.parse(params);

    if (params.format === 'csv') {
      const { items } = await listBuyers(ctx.supabase, ctx.organizationId, {
        page: 1, pageSize: 100000, q: parsed.q, country: params.country
      });
      const csv = toCsv(
        (items as Array<Record<string, unknown>>).map((b) => ({
          'Company Name': b.company_name,
          'Contact Person': b.contact_person,
          'Email': b.email,
          'Phone': b.phone,
          'Country': b.country,
          'City': b.city,
          'Website': b.website,
          'Products Interested': Array.isArray(b.products_interested) ? (b.products_interested as string[]).join(', ') : '',
          'Tags': Array.isArray(b.tags) ? (b.tags as string[]).join(', ') : '',
          'Notes': b.notes
        }))
      );
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="buyers.csv"'
        }
      });
    }

    const { items, count } = await listBuyers(ctx.supabase, ctx.organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      q: parsed.q,
      country: params.country,
      tag: params.tag
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
    const parsed = buyerSchema.parse(body);

    const { data, error } = await createBuyer(ctx.supabase, ctx.organizationId, ctx.userId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'create_buyer',
      entityType: 'buyer',
      entityId: data?.id,
      meta: { companyName: parsed.companyName },
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
