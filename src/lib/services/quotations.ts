import type { SupabaseClient } from '@supabase/supabase-js';

export interface QuotationItemInput {
  productId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export interface QuotationInput {
  leadId?: string | null;
  buyerId?: string | null;
  buyerName: string;
  buyerCompany?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  buyerCountry?: string | null;
  currency: string;
  incoterm: string;
  paymentTerms?: string | null;
  validityDays: number;
  discount: number;
  freight: number;
  insurance: number;
  taxRate: number;
  notes?: string | null;
  terms?: string | null;
  items: QuotationItemInput[];
}

export function computeQuotationTotals(input: Pick<QuotationInput, 'items' | 'discount' | 'freight' | 'insurance' | 'taxRate'>) {
  const subtotal = input.items.reduce((sum, item) => sum + item.amount, 0);
  const taxable = subtotal - input.discount;
  const tax = (taxable * input.taxRate) / 100;
  const total = taxable + tax + input.freight + input.insurance;
  return {
    subtotal: round2(subtotal),
    discount: round2(input.discount),
    tax: round2(tax),
    taxRate: input.taxRate,
    freight: round2(input.freight),
    insurance: round2(input.insurance),
    total: round2(total)
  };
}

const QUOTATION_SELECT = '*, items:quotation_items(*), lead:leads(id, buyer_name, company_name), versions:quotation_versions(*)';

export async function listQuotations(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; status?: string;
}) {
  let query = supabase
    .from('quotations')
    .select(QUOTATION_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.q) query = query.ilike('quotation_number', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getQuotation(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('quotations')
    .select(QUOTATION_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createQuotation(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  quotationNumber: string,
  input: QuotationInput
) {
  const totals = computeQuotationTotals(input);
  const expiresAt = new Date(Date.now() + input.validityDays * 86400000).toISOString();

  const { data, error } = await supabase
    .from('quotations')
    .insert({
      organization_id: organizationId,
      quotation_number: quotationNumber,
      lead_id: input.leadId ?? null,
      buyer_id: input.buyerId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      currency: input.currency,
      incoterm: input.incoterm,
      payment_terms: input.paymentTerms,
      validity_days: input.validityDays,
      discount: totals.discount,
      freight: totals.freight,
      insurance: totals.insurance,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes,
      terms: input.terms,
      expires_at: expiresAt,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('quotation_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      quotation_id: data.id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      amount: item.amount,
      sort_order: i
    }))
  );

  await saveVersion(supabase, organizationId, data.id, data, 1, 'Created');
  return { data, error: null };
}

export async function updateQuotation(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  userId: string,
  input: QuotationInput
) {
  const existing = await getQuotation(supabase, organizationId, id);
  if (!existing.data) return { data: null, error: existing.error };

  const totals = computeQuotationTotals(input);

  const { data, error } = await supabase
    .from('quotations')
    .update({
      lead_id: input.leadId ?? null,
      buyer_id: input.buyerId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      currency: input.currency,
      incoterm: input.incoterm,
      payment_terms: input.paymentTerms,
      validity_days: input.validityDays,
      discount: totals.discount,
      freight: totals.freight,
      insurance: totals.insurance,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes,
      terms: input.terms,
      expires_at: new Date(Date.now() + input.validityDays * 86400000).toISOString()
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('quotation_items').delete().eq('organization_id', organizationId).eq('quotation_id', id);
  await supabase.from('quotation_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      quotation_id: id,
      product_id: item.productId ?? null,
      description: item.description,
      hsn_code: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      amount: item.amount,
      sort_order: i
    }))
  );

  const version = ((existing.data.versions as unknown[])?.length ?? 0) + 1;
  await saveVersion(supabase, organizationId, id, data, version, 'Updated');

  return { data, error: null };
}

export async function setQuotationStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: string
) {
  const patch: Record<string, unknown> = { status };
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  if (status === 'accepted') patch.accepted_at = new Date().toISOString();
  if (status === 'rejected') patch.rejected_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('quotations')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteQuotation(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

async function saveVersion(
  supabase: SupabaseClient,
  organizationId: string,
  quotationId: string,
  snapshot: unknown,
  version: number,
  reason: string
) {
  await supabase.from('quotation_versions').insert({
    organization_id: organizationId,
    quotation_id: quotationId,
    version,
    snapshot,
    reason
  });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
