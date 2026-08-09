import type { SupabaseClient } from '@supabase/supabase-js';
import { camelToSnakeObject } from '@/lib/utils';
import type { shipmentSchema, shipmentEventSchema } from '@/lib/validations';
import type { z } from 'zod';

export type ShipmentInput = z.infer<typeof shipmentSchema>;

const SHIPMENT_SELECT = '*, buyer:buyers(id, company_name, contact_person, country), invoice:invoices(id, invoice_number, total, currency), events:shipment_events(*)';

export async function listShipments(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string; status?: string; mode?: string;
}) {
  let query = supabase
    .from('shipments')
    .select(SHIPMENT_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.mode) query = query.eq('mode', opts.mode);
  if (opts.q) {
    query = query.or(`shipment_number.ilike.%${opts.q}%,buyer_name.ilike.%${opts.q}%,bl_awb_no.ilike.%${opts.q}%,container_no.ilike.%${opts.q}%`);
  }

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getShipment(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select(SHIPMENT_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createShipment(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  shipmentNumber: string,
  input: ShipmentInput
) {
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      ...camelToSnakeObject(input),
      organization_id: organizationId,
      shipment_number: shipmentNumber,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateShipment(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: ShipmentInput
) {
  const { data, error } = await supabase
    .from('shipments')
    .update(camelToSnakeObject(input))
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function setShipmentStatus(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  status: string
) {
  const { data, error } = await supabase
    .from('shipments')
    .update({ status })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function addShipmentEvent(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: z.infer<typeof shipmentEventSchema>
) {
  const { data, error } = await supabase
    .from('shipment_events')
    .insert({
      organization_id: organizationId,
      shipment_id: input.shipmentId,
      stage: input.stage,
      note: input.note,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function deleteShipment(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}
