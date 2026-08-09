import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { warehouseSchema } from '@/lib/validations';

export type WarehouseInput = z.infer<typeof warehouseSchema>;

const WAREHOUSE_SELECT = '*';

export async function listWarehouses(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('warehouses')
    .select(WAREHOUSE_SELECT)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return { items: data ?? [], error };
}

export async function getWarehouse(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('warehouses')
    .select(WAREHOUSE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createWarehouse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: WarehouseInput
) {
  // If this is set as default, unset other defaults
  if (input.isDefault) {
    await supabase
      .from('warehouses')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('warehouses')
    .insert({
      organization_id: organizationId,
      name: input.name,
      location: input.location ?? null,
      is_default: input.isDefault,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateWarehouse(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: WarehouseInput
) {
  if (input.isDefault) {
    await supabase
      .from('warehouses')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('warehouses')
    .update({
      name: input.name,
      location: input.location ?? null,
      is_default: input.isDefault
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteWarehouse(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}