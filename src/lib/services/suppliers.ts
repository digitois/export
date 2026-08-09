import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { supplierSchema } from '@/lib/validations';

export type SupplierInput = z.infer<typeof supplierSchema>;

const SUPPLIER_SELECT = '*';

export async function listSuppliers(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string;
}) {
  let query = supabase
    .from('suppliers')
    .select(SUPPLIER_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.q) query = query.or(`name.ilike.%${opts.q}%,email.ilike.%${opts.q}%,contact_person.ilike.%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getSupplier(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select(SUPPLIER_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createSupplier(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: SupplierInput
) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      organization_id: organizationId,
      name: input.name,
      contact_person: input.contactPerson ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      country: input.country ?? null,
      gst_number: input.gstNumber ?? null,
      payment_terms: input.paymentTerms ?? null,
      currency: input.currency,
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateSupplier(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: SupplierInput
) {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: input.name,
      contact_person: input.contactPerson ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      country: input.country ?? null,
      gst_number: input.gstNumber ?? null,
      payment_terms: input.paymentTerms ?? null,
      currency: input.currency,
      notes: input.notes ?? null
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteSupplier(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}