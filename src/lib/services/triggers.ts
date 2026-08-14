import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConditionLeaf {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 
          'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 
          'is_empty' | 'is_not_empty' | 'in_list' | 'not_in_list';
  value?: unknown;
}

export interface Trigger {
  id: string;
  organization_id: string;
  name: string;
  event_type: string;
  conditions: ConditionLeaf[];
  condition_logic: 'and' | 'or';
  sequence_id: string;
  is_active: boolean;
  schedule_cron?: string | null;
  schedule_timezone?: string | null;
  webhook_endpoint_id?: string | null;
  fired_count: number;
  enrolled_count: number;
  skipped_count: number;
  last_fired_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerEvaluation {
  id: string;
  trigger_id: string;
  contact_id?: string | null;
  lead_id?: string | null;
  event_type: string;
  matched: boolean;
  enrolled: boolean;
  skip_reason?: string | null;
  error?: string | null;
  event_data: Record<string, unknown>;
  created_at: string;
}

export interface TriggerStats {
  totalFires: number;
  enrolledCount: number;
  skippedCount: number;
  lastFiredAt?: string | null;
}

export interface CreateTriggerInput {
  name: string;
  event_type: string;
  conditions: ConditionLeaf[];
  condition_logic?: 'and' | 'or';
  sequence_id: string;
  schedule_cron?: string;
  schedule_timezone?: string;
  webhook_endpoint_id?: string;
}

export interface UpdateTriggerInput {
  name?: string;
  is_active?: boolean;
  conditions?: ConditionLeaf[];
  condition_logic?: 'and' | 'or';
  schedule_cron?: string | null;
  schedule_timezone?: string | null;
  webhook_endpoint_id?: string | null;
}

// ============================================
// TRIGGER CRUD
// ============================================

export async function createTrigger(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateTriggerInput
) {
  const { data, error } = await supabase
    .from('triggers')
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: userId,
      condition_logic: input.condition_logic ?? 'and',
      conditions: input.conditions,
      fired_count: 0,
      enrolled_count: 0,
      skipped_count: 0
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getTrigger(supabase: SupabaseClient, organizationId: string, triggerId: string) {
  const { data, error } = await supabase
    .from('triggers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', triggerId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listTriggers(supabase: SupabaseClient, organizationId: string, opts: { activeOnly?: boolean; eventType?: string } = {}) {
  let query = supabase
    .from('triggers')
    .select('*, sequences(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.activeOnly) query = query.eq('is_active', true);
  if (opts.eventType) query = query.eq('event_type', opts.eventType);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function updateTrigger(
  supabase: SupabaseClient,
  organizationId: string,
  triggerId: string,
  input: UpdateTriggerInput
) {
  const { data, error } = await supabase
    .from('triggers')
    .update(input)
    .eq('organization_id', organizationId)
    .eq('id', triggerId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function deleteTrigger(supabase: SupabaseClient, organizationId: string, triggerId: string) {
  const { error } = await supabase
    .from('triggers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', triggerId);

  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function getTriggerStats(supabase: SupabaseClient, organizationId: string, triggerId: string): Promise<{ data: TriggerStats | null; error: Error | undefined }> {
  const { data, error } = await supabase
    .from('triggers')
    .select('fired_count, enrolled_count, skipped_count, last_fired_at')
    .eq('organization_id', organizationId)
    .eq('id', triggerId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  
  return { 
    data: {
      totalFires: data.fired_count,
      enrolledCount: data.enrolled_count,
      skippedCount: data.skipped_count,
      lastFiredAt: data.last_fired_at
    }, 
    error: undefined 
  };
}

export async function listTriggerEvaluations(
  supabase: SupabaseClient, 
  organizationId: string, 
  triggerId: string, 
  limit = 50
) {
  const { data, error } = await supabase
    .from('trigger_evaluations')
    .select('*, email_contacts(email, first_name, last_name)')
    .eq('trigger_id', triggerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

// ============================================
// TRIGGER EXECUTION (called by event system)
// ============================================

export async function fireTrigger(
  supabase: SupabaseClient,
  organizationId: string,
  eventType: string,
  contactId?: string,
  leadId?: string,
  eventData: Record<string, unknown> = {}
) {
  // Get all active triggers for this event type
  const { data: triggers, error } = await supabase
    .from('triggers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('event_type', eventType);

  if (error || !triggers?.length) return { data: [], error: undefined };

  const results = [];

  for (const trigger of triggers) {
    try {
      // Build contact data for condition evaluation
      const contactData = {
        contact_id: contactId,
        lead_id: leadId,
        event_type: eventType,
        event_data: eventData,
        ...eventData // Spread event data for field access
      };

      // Evaluate conditions
      const matched = evaluateConditions(trigger.conditions, contactData, trigger.condition_logic);

      if (matched) {
        // Enroll in sequence
        const { data: enrollment } = await supabase
          .from('sequence_enrollments')
          .insert({
            sequence_id: trigger.sequence_id,
            contact_id: contactId ?? null,
            lead_id: leadId ?? null,
            current_step_id: (
              await supabase
                .from('sequence_steps')
                .select('id')
                .eq('sequence_id', trigger.sequence_id)
                .order('position', { ascending: true })
                .limit(1)
                .single()
            ).data?.id ?? null,
            status: 'active'
          })
          .select()
          .single();

        // Log evaluation
        await supabase
          .from('trigger_evaluations')
          .insert({
            trigger_id: trigger.id,
            contact_id: contactId ?? null,
            lead_id: null,
            event_type: eventType,
            matched: true,
            enrolled: true,
            event_data: eventData
          });

        // Update trigger counters
        await supabase
          .from('triggers')
          .update({
            fired_count: trigger.fired_count + 1,
            enrolled_count: trigger.enrolled_count + 1,
            last_fired_at: new Date().toISOString()
          })
          .eq('id', trigger.id);

        results.push({ triggerId: trigger.id, matched: true, enrolled: true });
      } else {
        // Log skipped
        await supabase
          .from('trigger_evaluations')
          .insert({
            trigger_id: trigger.id,
            contact_id: contactId ?? null,
            lead_id: null,
            event_type: eventType,
            matched: false,
            enrolled: false,
            skip_reason: 'Conditions not met',
            event_data: eventData
          });

        await supabase
          .from('triggers')
          .update({ skipped_count: trigger.skipped_count + 1 })
          .eq('id', trigger.id);

        results.push({ triggerId: trigger.id, matched: false, enrolled: false });
      }
    } catch (err) {
      console.error(`Trigger ${trigger.id} execution failed:`, err);
      results.push({ triggerId: trigger.id, error: String(err) });
    }
  }

  return { data: results, error: undefined };
}

function evaluateConditions(conditions: any[], data: Record<string, unknown>, logic: 'and' | 'or' = 'and'): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = logic === 'and';

  for (const condition of conditions) {
    const fieldValue = data[condition.field];
    const conditionResult = evaluateCondition(fieldValue, condition.operator, condition.value);

    if (logic === 'and') {
      result = result && conditionResult;
      if (!result) return false;
    } else {
      result = result || conditionResult;
      if (result) return true;
    }
  }

  return result;
}

function evaluateCondition(fieldValue: unknown, operator: string, value: unknown): boolean {
  const fv = fieldValue ?? '';
  const cv = value ?? '';

  switch (operator) {
    case 'equals': return fv === cv;
    case 'not_equals': return fv !== cv;
    case 'contains': return String(fv).toLowerCase().includes(String(cv).toLowerCase());
    case 'not_contains': return !String(fv).toLowerCase().includes(String(cv).toLowerCase());
    case 'starts_with': return String(fv).toLowerCase().startsWith(String(cv).toLowerCase());
    case 'ends_with': return String(fv).toLowerCase().endsWith(String(cv).toLowerCase());
    case 'greater_than': return Number(fv) > Number(cv);
    case 'less_than': return Number(fv) < Number(cv);
    case 'greater_equal': return Number(fv) >= Number(cv);
    case 'less_equal': return Number(fv) <= Number(cv);
    case 'is_empty': return fv === null || fv === undefined || String(fv).trim() === '';
    case 'is_not_empty': return fv !== null && fv !== undefined && String(fv).trim() !== '';
    case 'in_list': return Array.isArray(cv) && cv.includes(fieldValue);
    case 'not_in_list': return Array.isArray(cv) && !cv.includes(fieldValue);
    default: return false;
  }
}