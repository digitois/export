import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject } from '@/lib/utils';

export async function listBuyers(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; country?: string; tag?: string;
}) {
  let query = supabase
    .from('buyers')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.country) query = query.eq('country', opts.country);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.q) {
    query = query.or(`company_name.ilike.%${opts.q}%,contact_person.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function createBuyer(supabase: SupabaseClient, organizationId: string, userId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('buyers')
    .insert({ ...camelToSnakeObject(payload), organization_id: organizationId, created_by: userId })
    .select()
    .single();
  return { data, error };
}

export async function updateBuyer(supabase: SupabaseClient, organizationId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('buyers')
    .update(camelToSnakeObject(payload))
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteBuyer(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('buyers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

export async function getBuyer(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function importBuyers(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  rows: Array<Record<string, string>>
) {
  const { error } = await supabase.from('buyers').insert(
    rows.map((row) => ({
      organization_id: organizationId,
      created_by: userId,
      company_name: row['Company Name'] ?? row.company_name ?? 'Unknown',
      contact_person: row['Contact Person'] ?? row.contact_person ?? null,
      email: row['Email'] ?? row.email ?? null,
      phone: row['Phone'] ?? row.phone ?? null,
      website: row['Website'] ?? row.website ?? null,
      country: row['Country'] ?? row.country ?? null,
      city: row['City'] ?? row.city ?? null,
      notes: row['Notes'] ?? row.notes ?? null,
      tags: row['Tags'] ? (row['Tags'] as string).split(',').map((t) => t.trim()).filter(Boolean) : [],
      products_interested: row['Products Interested'] ? [row['Products Interested']] : []
    }))
  );
  return { error };
}
