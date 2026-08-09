import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { stockMovementSchema } from '@/lib/validations';

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

const STOCK_LEVEL_SELECT = '*, product:products(id, name, sku), warehouse:warehouses(id, name)';
const STOCK_MOVEMENT_SELECT = '*, product:products(id, name, sku), warehouse:warehouses(id, name)';

export async function listStockLevels(supabase: SupabaseClient, organizationId: string, opts: {
  warehouseId?: string; lowStockOnly?: boolean;
}) {
  let query = supabase
    .from('stock_levels')
    .select(STOCK_LEVEL_SELECT)
    .eq('organization_id', organizationId);

  if (opts.warehouseId) query = query.eq('warehouse_id', opts.warehouseId);
  if (opts.lowStockOnly) {
    query = query.filter('quantity', 'lte', 'reorder_point');
  }

  const { data, error } = await query.order('quantity', { ascending: true });
  return { items: data ?? [], error };
}

export async function getStockLevel(supabase: SupabaseClient, organizationId: string, productId: string, warehouseId: string) {
  const { data, error } = await supabase
    .from('stock_levels')
    .select(STOCK_LEVEL_SELECT)
    .eq('organization_id', organizationId)
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .single();
  return { data, error };
}

export async function listStockMovements(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; productId?: string; warehouseId?: string; type?: string;
}) {
  let query = supabase
    .from('stock_movements')
    .select(STOCK_MOVEMENT_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('occurred_at', { ascending: false });

  if (opts.productId) query = query.eq('product_id', opts.productId);
  if (opts.warehouseId) query = query.eq('warehouse_id', opts.warehouseId);
  if (opts.type) query = query.eq('type', opts.type);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function createStockMovement(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: StockMovementInput
) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert({
      organization_id: organizationId,
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      type: input.type,
      quantity: input.quantity,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      notes: input.notes ?? null,
      occurred_at: input.occurredAt,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Adjust stock level and create a movement record in a single transaction.
 * Positive delta = stock in, negative = stock out.
 */
export async function adjustStock(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  productId: string,
  warehouseId: string,
  delta: number,
  referenceType: string | null,
  referenceId: string | null,
  notes: string | null
) {
  if (delta === 0) return { data: null, error: null };

  const type = delta > 0 ? 'in' : 'out';
  const quantity = Math.abs(delta);

  // Update or create stock level
  const { data: level, error: levelError } = await supabase
    .from('stock_levels')
    .upsert({
      organization_id: organizationId,
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: delta // postgres will add to existing via on conflict? No, we need to read first
    }, { onConflict: 'product_id,warehouse_id' })
    .select()
    .single();

  // Actually, let's do it properly: read current, add delta, update
  const { data: current } = await supabase
    .from('stock_levels')
    .select('quantity')
    .eq('organization_id', organizationId)
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .single();

  const currentQty = (current as any)?.quantity ?? 0;
  const newQty = Math.max(0, currentQty + delta);

  const { error: updateError } = await supabase
    .from('stock_levels')
    .upsert({
      organization_id: organizationId,
      product_id: productId,
      warehouse_id: warehouseId,
      quantity: newQty
    }, { onConflict: 'product_id,warehouse_id' });

  if (updateError) return { data: null, error: updateError };

  // Record movement
  const { data: movement, error: movError } = await supabase
    .from('stock_movements')
    .insert({
      organization_id: organizationId,
      product_id: productId,
      warehouse_id: warehouseId,
      type,
      quantity,
      reference_type: referenceType,
      reference_id: referenceId,
      notes,
      occurred_at: new Date().toISOString(),
      created_by: userId
    })
    .select()
    .single();

  return { data: movement, error: movError };
}