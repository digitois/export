import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { leadStageSchema } from '@/lib/validations';

export type LeadStageInput = z.infer<typeof leadStageSchema>;

const STAGE_SELECT = '*';

export async function listLeadStages(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('lead_stages')
    .select(STAGE_SELECT)
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });
  return { items: data ?? [], error };
}

export async function getLeadStage(supabase: SupabaseClient, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from('lead_stages')
    .select(STAGE_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createLeadStage(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: LeadStageInput
) {
  // If this is set as default, unset other defaults
  if (input.isDefault) {
    await supabase
      .from('lead_stages')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('lead_stages')
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? null,
      color: input.color,
      sort_order: input.sortOrder,
      is_default: input.isDefault,
      is_won: input.isWon,
      is_lost: input.isLost,
      created_by: userId
    })
    .select()
    .single();
  return { data, error };
}

export async function updateLeadStage(
  supabase: SupabaseClient,
  organizationId: string,
  id: string,
  input: LeadStageInput
) {
  if (input.isDefault) {
    await supabase
      .from('lead_stages')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('lead_stages')
    .update({
      name: input.name,
      description: input.description ?? null,
      color: input.color,
      sort_order: input.sortOrder,
      is_default: input.isDefault,
      is_won: input.isWon,
      is_lost: input.isLost
    })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteLeadStage(supabase: SupabaseClient, organizationId: string, id: string) {
  const { error } = await supabase
    .from('lead_stages')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  return { error };
}