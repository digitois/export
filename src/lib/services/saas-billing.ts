import type { SupabaseClient } from '@supabase/supabase-js';
import { getNextSequence } from '@/lib/services/sequences';

export interface SaasInvoiceItemInput {
  description: string;
  quantity?: number;
  unitPrice?: number;
}

export interface SaasInvoiceInput {
  organizationId: string;
  subscriptionId?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate?: string;
  dueDate?: string | null;
  currency?: string;
  tax?: number;
  notes?: string | null;
  items: SaasInvoiceItemInput[];
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
}

export function computeSaasInvoiceTotals(
  items: SaasInvoiceItemInput[],
  opts: { tax?: number } = {}
) {
  const lines = items.map((item) => {
    const quantity = round2(item.quantity ?? 1);
    const unitPrice = round2(item.unitPrice ?? 0);
    return {
      description: item.description,
      quantity,
      unit_price: unitPrice,
      amount: round2(quantity * unitPrice)
    };
  });
  const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const tax = round2(opts.tax ?? 0);
  const total = round2(subtotal + tax);
  return { lines, subtotal, tax, total };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createSaasInvoice(
  supabase: SupabaseClient,
  userId: string,
  input: SaasInvoiceInput
) {
  const { lines, subtotal, tax, total } = computeSaasInvoiceTotals(input.items, { tax: input.tax });

  const invoiceNumber = await getNextSequence(supabase, input.organizationId, 'SAASINV');

  const { data: invoice, error } = await supabase
    .from('saas_invoices')
    .insert({
      organization_id: input.organizationId,
      subscription_id: input.subscriptionId ?? null,
      invoice_number: invoiceNumber,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      issue_date: input.issueDate ?? new Date().toISOString().slice(0, 10),
      due_date: input.dueDate ?? null,
      currency: input.currency ?? 'USD',
      subtotal,
      tax,
      total,
      amount_paid: 0,
      status: input.status ?? 'draft',
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();

  if (error) return { data: null, error };

  const itemRows = lines.map((line, i) => ({
    organization_id: input.organizationId,
    saas_invoice_id: invoice.id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    amount: line.amount,
    sort_order: i
  }));

  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from('saas_invoice_items').insert(itemRows);
    if (itemError) return { data: null, error: itemError };
  }

  const { data: full } = await supabase
    .from('saas_invoices')
    .select('*, saas_invoice_items(*)')
    .eq('id', invoice.id)
    .single();

  return { data: full, error: null };
}

export async function listSaasInvoices(
  supabase: SupabaseClient,
  opts: { organizationId?: string; page: number; pageSize: number; status?: string }
) {
  let query = supabase
    .from('saas_invoices')
    .select('*, saas_invoice_items(*), organizations(name)', { count: 'exact' })
    .order('issue_date', { ascending: false });

  if (opts.organizationId) query = query.eq('organization_id', opts.organizationId);
  if (opts.status) query = query.eq('status', opts.status);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getSaasInvoice(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('saas_invoices')
    .select('*, saas_invoice_items(*), organizations(name), subscriptions(plan_id, status, billing_cycle, plans(name))')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function setSaasInvoiceStatus(
  supabase: SupabaseClient,
  id: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
) {
  const { data, error } = await supabase
    .from('saas_invoices')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function recordSaasInvoicePayment(
  supabase: SupabaseClient,
  id: string,
  amount: number
) {
  const { data: invoice } = await supabase
    .from('saas_invoices')
    .select('amount_paid, total, status')
    .eq('id', id)
    .single();

  if (!invoice) return { data: null, error: new Error('Invoice not found') };

  const amountPaid = round2(Number(invoice.amount_paid ?? 0) + Number(amount ?? 0));
  const total = Number(invoice.total ?? 0);
  const status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void' =
    amountPaid >= total ? 'paid' : invoice.status === 'void' ? 'void' : 'sent';

  const { data, error } = await supabase
    .from('saas_invoices')
    .update({ amount_paid: amountPaid, status })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function deleteSaasInvoice(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('saas_invoices').delete().eq('id', id);
  return { error };
}

export async function listSubscriptions(
  supabase: SupabaseClient,
  opts: { page: number; pageSize: number; status?: string }
) {
  let query = supabase
    .from('subscriptions')
    .select('*, plans(name, code, price_monthly, price_annual), organizations(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getSubscription(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plans(*), organizations(name, status)')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function cancelSubscription(supabase: SupabaseClient, id: string, cancelAtPeriodEnd: boolean) {
  const patch: Record<string, unknown> = { cancel_at_period_end: cancelAtPeriodEnd };
  if (!cancelAtPeriodEnd) patch.status = 'cancelled';

  const { data, error } = await supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}
