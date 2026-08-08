import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates sequential business document numbers per organization, per year.
 * Counter state is stored in organization_settings to guarantee uniqueness.
 */
export async function getNextSequence(
  supabase: SupabaseClient,
  organizationId: string,
  prefix: string,
  year = new Date().getFullYear()
): Promise<string> {
  const key = `sequence:${prefix}:${year}`;

  const { data: row } = await supabase
    .from('organization_settings')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('key', key)
    .single();

  const current = typeof row?.value === 'number' ? row.value : 0;
  const next = current + 1;

  await supabase.from('organization_settings').upsert(
    { organization_id: organizationId, key, value: next },
    { onConflict: 'organization_id,key' }
  );

  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}
