import type { SupabaseClient } from '@supabase/supabase-js';
import { computeLandedCost, round2 } from '@/lib/services/landed-cost';
import type { z } from 'zod';
import type { landedCostSchema } from '@/lib/validations';

export type LandedCostInput = z.infer<typeof landedCostSchema>;

const ESTIMATE_SELECT = '*';

export async function listLandedCostEstimates(supabase: SupabaseClient, organizationId: string, opts: {
  page: number; pageSize: number; q?: string;
}) {
  let query = supabase
    .from('landed_cost_estimates')
    .select(ESTIMATE_SELECT, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.q) query = query.ilike('name', `%${opts.q}%`);

  const from = (opts.page - 1) * opts.pageSize;
  const { data, count } = await query.range(from, from + opts.pageSize - 1);
  return { items: data ?? [], count: count ?? 0 };
}

export async function getLandedCostEstimate(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('landed_cost_estimates')
    .select(ESTIMATE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createLandedCostEstimate(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: LandedCostInput
) {
  const result = computeLandedCost({
    productValue: input.productValue,
    freight: input.freight,
    insurance: input.insurance,
    dutyRate: input.dutyRate,
    otherCharges: input.otherCharges,
    quantity: input.quantity,
    incoterm: input.incoterm
  });

  const { data, error } = await supabase
    .from('landed_cost_estimates')
    .insert({
      organization_id: organizationId,
      name: input.name,
      currency: input.currency,
      product_value: input.productValue,
      freight: input.freight,
      insurance: input.insurance,
      duty_rate: input.dutyRate,
      other_charges: input.otherCharges,
      quantity: input.quantity,
      incoterm: input.incoterm,
      result: result as unknown as Record<string, unknown>,
      notes: input.notes ?? null,
      created_by: userId
    })
    .select()
    .single();

  return { data, error, result };
}

export async function deleteLandedCostEstimate(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('landed_cost_estimates')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}

export { round2 };
