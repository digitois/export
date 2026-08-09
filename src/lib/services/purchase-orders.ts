import type { SupabaseClient } from '@supabase/supabase-js';
import { round2 } from '@/lib/services/landed-cost';
import type { z } from 'zod';
import type { purchaseOrderSchema } from '@/lib/validations';

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

interface POItem {
  id: string;
  product_id: string | null;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  tax_rate: number;
  received_quantity: number | null;
  amount: number;
}

const PO_SELECT = '*, items:purchase_order_items(*), supplier:suppliers(id, name, contact_person, email)';

export function computePOTotals(input: Pick<PurchaseOrderInput, 'items' | 'discount' | 'taxRate' | 'shippingCharges'>) {
  const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxable = subtotal - input.discount;
  const tax = (taxable * input.taxRate) / 100;
  const total = taxable + tax + input.shippingCharges;
  return {
    subtotal: round2(subtotal),
    discount: round2(input.discount),
    tax: round2(tax),
    taxRate: input.taxRate,
    shippingCharges: round2(input.shippingCharges),
    total: round2(total)
  };
}

export async function listPurchaseOrders(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; status?: string;
}) {
  let query = supabase
    .from('purchase_orders')
    .select(PO_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.q) query = query.ilike('po_number', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getPurchaseOrder(
  supabase: SupabaseClient,
  organizationId: string,
  id: string
): Promise<{ data: { items: POItem[] } & Record<string, unknown> | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(PO_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createPurchaseOrder(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  poNumber: string,
  input: PurchaseOrderInput
) {
  const totals = computePOTotals(input);

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      organization_id: organizationId,
      po_number: poNumber,
      supplier_id: input.supplierId ?? null,
      supplier_name: input.supplierName,
      supplier_company: input.supplierCompany,
      supplier_address: input.supplierAddress,
      supplier_country: input.supplierCountry,
      warehouse_id: input.warehouseId ?? null,
      currency: input.currency,
      status: 'draft',
      order_date: input.orderDate,
      expected_date: input.expectedDate ?? null,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      shipping_charges: totals.shippingCharges,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes,
      terms: input.terms,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('purchase_order_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      purchase_order_id: data.id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      amount: round2(item.quantity * item.unitPrice),
      tax_rate: item.taxRate,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function updatePurchaseOrder(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: PurchaseOrderInput
) {
  const totals = computePOTotals(input);

  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      supplier_id: input.supplierId ?? null,
      supplier_name: input.supplierName,
      supplier_company: input.supplierCompany,
      supplier_address: input.supplierAddress,
      supplier_country: input.supplierCountry,
      warehouse_id: input.warehouseId ?? null,
      currency: input.currency,
      order_date: input.orderDate,
      expected_date: input.expectedDate ?? null,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      shipping_charges: totals.shippingCharges,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes,
      terms: input.terms
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('purchase_order_items').delete().eq('organization_id', organizationId).eq('purchase_order_id', id);
  await supabase.from('purchase_order_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      purchase_order_id: id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      amount: round2(item.quantity * item.unitPrice),
      tax_rate: item.taxRate,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function setPOStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: string
) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function receivePurchaseOrder(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  id: string,
  receivedItems: Array<{ itemId: string; receivedQty: number }>
) {
  // Get PO with items
  const { data: po, error } = await getPurchaseOrder(supabase, organizationId, id);
  if (error || !po) return { data: null, error: error ?? new Error('PO not found') };

  // Update received quantities and stock
  for (const ri of receivedItems) {
    const item = po.items?.find((i) => i.id === ri.itemId);
    if (!item) continue;

    const newReceived = (item.received_quantity ?? 0) + ri.receivedQty;

    await supabase
      .from('purchase_order_items')
      .update({ received_quantity: newReceived })
      .eq('organization_id', organizationId)
      .eq('id', ri.itemId);

    // Create stock movement for each received item
    if (po.warehouse_id && ri.receivedQty > 0) {
      await supabase.from('stock_movements').insert({
        organization_id: organizationId,
        product_id: item.product_id,
        warehouse_id: po.warehouse_id,
        type: 'in',
        quantity: ri.receivedQty,
        reference_type: 'purchase_order',
        reference_id: id,
        notes: `Received from PO ${po.po_number}`,
        occurred_at: new Date().toISOString(),
        created_by: userId
      });

      // Adjust stock level
      const { data: current } = await supabase
        .from('stock_levels')
        .select('quantity')
        .eq('organization_id', organizationId)
        .eq('product_id', item.product_id)
        .eq('warehouse_id', po.warehouse_id)
        .single();

      const currentQty = (current as any)?.quantity ?? 0;
      await supabase
        .from('stock_levels')
        .upsert({
          organization_id: organizationId,
          product_id: item.product_id,
          warehouse_id: po.warehouse_id,
          quantity: currentQty + ri.receivedQty
        }, { onConflict: 'product_id,warehouse_id' });
    }
  }

  // Update PO status
  const allReceived = (po.items ?? []).every((item) => {
    const ri = receivedItems.find((r) => r.itemId === item.id);
    const received = (item.received_quantity ?? 0) + (ri?.receivedQty ?? 0);
    return received >= item.quantity;
  });

  const nextStatus = allReceived ? 'received' : 'partially_received';
  await supabase
    .from('purchase_orders')
    .update({ status: nextStatus })
    .eq('organization_id', organizationId)
    .eq('id', id);

  return { data: { status: nextStatus }, error: null };
}

export async function deletePurchaseOrder(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}