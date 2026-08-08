import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { productSchema } from '@/lib/validations';
import { getProduct, updateProduct, deleteProduct } from '@/lib/services/products';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { data, error } = await getProduct(ctx.supabase, ctx.organizationId, id);
    if (error || !data) return ok({ error: 'Product not found' }, { status: 404 });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = productSchema.partial().parse(body);

    const { data, error } = await updateProduct(ctx.supabase, ctx.organizationId, id, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_product',
      entityType: 'product',
      entityId: id,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { error } = await deleteProduct(ctx.supabase, ctx.organizationId, id);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'delete_product',
      entityType: 'product',
      entityId: id,
      ip: _request.headers.get('x-forwarded-for')
    });

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
