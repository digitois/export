import type { SupabaseClient } from '@supabase/supabase-js';
import { round2 } from '@/lib/services/landed-cost';
import type { z } from 'zod';
import type { packingListSchema } from '@/lib/validations';

export type PackingListInput = z.infer<typeof packingListSchema>;

const PACKING_LIST_SELECT = '*, items:packing_list_items(*)';

export function computePackingListTotals(items: PackingListInput['items']) {
  const totals = items.reduce(
    (acc, item) => ({
      packages: acc.packages + (item.packageCount || 0),
      weight: acc.weight + (item.weightKg || 0),
      volume: acc.volume + (item.volumeCbm || 0)
    }),
    { packages: 0, weight: 0, volume: 0 }
  );
  return {
    totalPackages: totals.packages,
    totalWeightKg: round2(totals.weight),
    totalVolumeCbm: round2(totals.volume)
  };
}

export async function listPackingLists(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string;
}) {
  let query = supabase
    .from('packing_lists')
    .select(PACKING_LIST_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.q) query = query.ilike('packing_list_number', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getPackingList(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('packing_lists')
    .select(PACKING_LIST_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createPackingList(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  packingListNumber: string,
  input: PackingListInput
) {
  const totals = computePackingListTotals(input.items);

  const { data, error } = await supabase
    .from('packing_lists')
    .insert({
      organization_id: organizationId,
      packing_list_number: packingListNumber,
      shipment_id: input.shipmentId ?? null,
      invoice_id: input.invoiceId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      container_no: input.containerNo,
      bl_awb_no: input.blAwbNo,
      port_of_loading: input.portOfLoading,
      port_of_discharge: input.portOfDischarge,
      vessel: input.vessel,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_volume_cbm: totals.totalVolumeCbm,
      currency: input.currency,
      notes: input.notes,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('packing_list_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      packing_list_id: data.id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      package_count: item.packageCount,
      weight_kg: item.weightKg,
      volume_cbm: item.volumeCbm,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function updatePackingList(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: PackingListInput
) {
  const totals = computePackingListTotals(input.items);

  const { data, error } = await supabase
    .from('packing_lists')
    .update({
      shipment_id: input.shipmentId ?? null,
      invoice_id: input.invoiceId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      container_no: input.containerNo,
      bl_awb_no: input.blAwbNo,
      port_of_loading: input.portOfLoading,
      port_of_discharge: input.portOfDischarge,
      vessel: input.vessel,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_volume_cbm: totals.totalVolumeCbm,
      currency: input.currency,
      notes: input.notes
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('packing_list_items').delete().eq('organization_id', organizationId).eq('packing_list_id', id);
  await supabase.from('packing_list_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      packing_list_id: id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      package_count: item.packageCount,
      weight_kg: item.weightKg,
      volume_cbm: item.volumeCbm,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function deletePackingList(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('packing_lists')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}
