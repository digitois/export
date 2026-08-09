import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { certificateOfOriginSchema } from '@/lib/validations';

export type CertificateOfOriginInput = z.infer<typeof certificateOfOriginSchema>;

const COO_SELECT = '*, items:certificate_of_origin_items(*)';

export function computeCertificateTotals(items: CertificateOfOriginInput['items']) {
  return {
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + (item.unitValue || 0) * item.quantity, 0),
    totalGrossWeight: items.reduce((sum, item) => sum + (item.grossWeightKg || 0), 0),
    totalNetWeight: items.reduce((sum, item) => sum + (item.netWeightKg || 0), 0)
  };
}

export async function listCertificatesOfOrigin(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; type?: string;
}) {
  let query = supabase
    .from('certificates_of_origin')
    .select(COO_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.type) query = query.eq('certificate_type', opts.type);
  if (opts.q) query = query.ilike('coo_number', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getCertificateOfOrigin(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('certificates_of_origin')
    .select(COO_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createCertificateOfOrigin(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  cooNumber: string,
  input: CertificateOfOriginInput
) {
  const { data, error } = await supabase
    .from('certificates_of_origin')
    .insert({
      organization_id: organizationId,
      coo_number: cooNumber,
      certificate_type: input.certificateType,
      shipment_id: input.shipmentId ?? null,
      invoice_id: input.invoiceId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      exporter_iec: input.exporterIec,
      country_of_origin: input.countryOfOrigin,
      country_of_destination: input.countryOfDestination,
      issued_date: input.issuedDate,
      notes: input.notes,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('certificate_of_origin_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      certificate_id: data.id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_value: item.unitValue,
      gross_weight_kg: item.grossWeightKg,
      net_weight_kg: item.netWeightKg,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function updateCertificateOfOrigin(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: CertificateOfOriginInput
) {
  const { data, error } = await supabase
    .from('certificates_of_origin')
    .update({
      certificate_type: input.certificateType,
      shipment_id: input.shipmentId ?? null,
      invoice_id: input.invoiceId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      exporter_iec: input.exporterIec,
      country_of_origin: input.countryOfOrigin,
      country_of_destination: input.countryOfDestination,
      issued_date: input.issuedDate,
      notes: input.notes
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('certificate_of_origin_items').delete().eq('organization_id', organizationId).eq('certificate_id', id);
  await supabase.from('certificate_of_origin_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      certificate_id: id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_value: item.unitValue,
      gross_weight_kg: item.grossWeightKg,
      net_weight_kg: item.netWeightKg,
      sort_order: i
    }))
  );

  return { data, error: null };
}

export async function deleteCertificateOfOrigin(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('certificates_of_origin')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}
