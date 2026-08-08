import type { SupabaseClient } from '@supabase/supabase-js';
import { round2 } from '@/lib/services/quotations';

export interface InvoiceItemInput {
  productId?: string | null;
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export interface InvoiceInput {
  invoiceType: string;
  quotationId?: string | null;
  leadId?: string | null;
  buyerId?: string | null;
  buyerName: string;
  buyerCompany?: string | null;
  buyerEmail?: string | null;
  buyerAddress?: string | null;
  buyerCountry?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  currency: string;
  paymentTerms?: string | null;
  discount: number;
  taxRate: number;
  shippingCharges: number;
  notes?: string | null;
  items: InvoiceItemInput[];
}

export function computeInvoiceTotals(input: Pick<InvoiceInput, 'items' | 'discount' | 'taxRate' | 'shippingCharges'>) {
  const subtotal = input.items.reduce((sum, item) => sum + item.amount, 0);
  const taxable = subtotal - input.discount;
  const tax = (taxable * input.taxRate) / 100;
  const total = taxable + tax + input.shippingCharges;
  return {
    subtotal: round2(subtotal),
    discount: round2(input.discount),
    tax: round2(tax),
    taxRate: input.taxRate,
    shipping_charges: round2(input.shippingCharges),
    total: round2(total)
  };
}

const INVOICE_SELECT = '*, items:invoice_items(*), payments:invoice_payments(*)';

export async function listInvoices(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; status?: string; type?: string;
}) {
  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.type) query = query.eq('invoice_type', opts.type);
  if (opts.q) query = query.ilike('invoice_number', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getInvoice(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createInvoice(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  invoiceNumber: string,
  input: InvoiceInput
) {
  const totals = computeInvoiceTotals(input);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: organizationId,
      invoice_number: invoiceNumber,
      invoice_type: input.invoiceType,
      quotation_id: input.quotationId ?? null,
      lead_id: input.leadId ?? null,
      buyer_id: input.buyerId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_email: input.buyerEmail,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate ?? null,
      currency: input.currency,
      payment_terms: input.paymentTerms,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      shipping_charges: totals.shipping_charges,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('invoice_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      invoice_id: data.id,
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

  return { data, error: null };
}

export async function updateInvoice(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: InvoiceInput
) {
  const totals = computeInvoiceTotals(input);

  const { data, error } = await supabase
    .from('invoices')
    .update({
      invoice_type: input.invoiceType,
      quotation_id: input.quotationId ?? null,
      lead_id: input.leadId ?? null,
      buyer_id: input.buyerId ?? null,
      buyer_name: input.buyerName,
      buyer_company: input.buyerCompany,
      buyer_email: input.buyerEmail,
      buyer_address: input.buyerAddress,
      buyer_country: input.buyerCountry,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate ?? null,
      currency: input.currency,
      payment_terms: input.paymentTerms,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: totals.taxRate,
      shipping_charges: totals.shipping_charges,
      subtotal: totals.subtotal,
      total: totals.total,
      notes: input.notes
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  await supabase.from('invoice_items').delete().eq('organization_id', organizationId).eq('invoice_id', id);
  await supabase.from('invoice_items').insert(
    input.items.map((item, i) => ({
      organization_id: organizationId,
      invoice_id: id,
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

  return { data, error: null };
}

export async function setInvoiceStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: string
) {
  const patch: Record<string, unknown> = { status };
  if (status === 'paid') patch.paid_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function recordInvoicePayment(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  invoiceId: string,
  input: { amount: number; currency: string; paymentDate?: string; method?: string; reference?: string; notes?: string }
) {
  const { data, error } = await supabase
    .from('invoice_payments')
    .insert({
      organization_id: organizationId,
      invoice_id: invoiceId,
      amount: input.amount,
      currency: input.currency,
      payment_date: input.paymentDate ?? new Date().toISOString().slice(0, 10),
      method: input.method ?? 'bank_transfer',
      reference: input.reference,
      notes: input.notes,
      created_by: userId
    })
    .select()
    .single();

  if (error || !data) return { data, error };

  const invoice = await getInvoice(supabase, organizationId, invoiceId);
  if (invoice.data) {
    const paid = round2((invoice.data.amount_paid ?? 0) + input.amount);
    const nextStatus = paid >= invoice.data.total ? 'paid' : invoice.data.status === 'paid' ? 'paid' : 'partially_paid';
    await supabase
      .from('invoices')
      .update({ amount_paid: paid, status: nextStatus, paid_at: nextStatus === 'paid' ? new Date().toISOString() : invoice.data.paid_at })
      .eq('organization_id', organizationId)
      .eq('id', invoiceId);
  }

  return { data, error };
}

export async function deleteInvoice(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}
