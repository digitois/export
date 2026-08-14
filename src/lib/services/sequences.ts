import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Types for sequences (geniusCampaign style: linear delay + send_email)
export interface Sequence {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  step_count: number;
  enrolled_count: number;
  open_count: number;
  has_active_enrollments: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  type: 'wait' | 'send_email';
  position: number;
  delay_value?: number | null;
  delay_unit?: 'minutes' | 'hours' | 'days' | null;
  template_id?: string | null;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  lead_id?: string | null;
  current_step_id?: string | null;
  status: 'active' | 'paused' | 'stopped' | 'completed';
  started_at: string;
  completed_at?: string | null;
  metadata: Record<string, unknown>;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateStepInput {
  type: 'wait' | 'send_email';
  delay_value?: number;
  delay_unit?: 'minutes' | 'hours' | 'days';
  template_id?: string;
}

export interface EnrollContactInput {
  contact_id: string;
  lead_id?: string;
}

// ============================================
// SEQUENCE CRUD
// ============================================

export async function createSequence(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateSequenceInput
) {
  const { data, error } = await supabase
    .from('sequences')
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: userId,
      step_count: 0,
      enrolled_count: 0,
      open_count: 0,
      has_active_enrollments: false
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getSequence(supabase: SupabaseClient, organizationId: string, sequenceId: string) {
  const { data, error } = await supabase
    .from('sequences')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', sequenceId)
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listSequences(supabase: SupabaseClient, organizationId: string, opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from('sequences')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (opts.activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

export async function updateSequence(supabase: SupabaseClient, organizationId: string, sequenceId: string, updates: Partial<Sequence>) {
  const { data, error } = await supabase
    .from('sequences')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('id', sequenceId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function deleteSequence(supabase: SupabaseClient, organizationId: string, sequenceId: string) {
  const { error } = await supabase
    .from('sequences')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', sequenceId);

  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

// ============================================
// SEQUENCE STEPS
// ============================================

export async function addStep(
  supabase: SupabaseClient,
  organizationId: string,
  sequenceId: string,
  input: CreateStepInput
) {
  // Get max position
  const { data: maxPos } = await supabase
    .from('sequence_steps')
    .select('position')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('sequence_steps')
    .insert({
      sequence_id: sequenceId,
      ...input,
      position
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  // Update sequence step_count
  await supabase.rpc('increment_sequence_counters', { p_sequence_id: sequenceId });

  return { data, error: undefined };
}

export async function updateStep(supabase: SupabaseClient, organizationId: string, stepId: string, updates: Partial<SequenceStep>) {
  // Verify ownership
  const { data: step } = await supabase
    .from('sequence_steps')
    .select('sequence_id')
    .eq('id', stepId)
    .single();

  if (!step) return { data: null, error: new Error('Step not found') };

  const { data: seq } = await supabase
    .from('sequences')
    .select('organization_id')
    .eq('id', step.sequence_id)
    .single();

  if (!seq || seq.organization_id !== organizationId) {
    return { data: null, error: new Error('Unauthorized') };
  }

  const { data, error } = await supabase
    .from('sequence_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function removeStep(supabase: SupabaseClient, organizationId: string, stepId: string) {
  const { data: step } = await supabase
    .from('sequence_steps')
    .select('sequence_id')
    .eq('id', stepId)
    .single();

  if (!step) return { error: new Error('Step not found') };

  const { data: seq } = await supabase
    .from('sequences')
    .select('organization_id')
    .eq('id', step.sequence_id)
    .single();

  if (!seq || seq.organization_id !== organizationId) {
    return { error: new Error('Unauthorized') };
  }

  const { error } = await supabase
    .from('sequence_steps')
    .delete()
    .eq('id', stepId);

  if (error) return { error: new Error(error.message) };

  // Update sequence step_count
  await supabase.rpc('increment_sequence_counters', { p_sequence_id: step.sequence_id });

  return { error: undefined };
}

export async function reorderSteps(supabase: SupabaseClient, organizationId: string, sequenceId: string, stepIds: string[]) {
  // Verify ownership
  const { data: seq } = await supabase
    .from('sequences')
    .select('organization_id')
    .eq('id', sequenceId)
    .single();

  if (!seq || seq.organization_id !== organizationId) {
    return { error: new Error('Unauthorized') };
  }

  const updates = stepIds.map((id, index) => ({ id, position: index }));
  const { error } = await supabase.from('sequence_steps').upsert(updates);
  
  if (error) return { error: new Error(error.message) };
  return { error: undefined };
}

export async function listSteps(supabase: SupabaseClient, sequenceId: string) {
  const { data, error } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true });

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

// ============================================
// ENROLLMENTS
// ============================================

export async function enrollContact(
  supabase: SupabaseClient,
  organizationId: string,
  sequenceId: string,
  contactId: string,
  leadId?: string
) {
  // Verify sequence belongs to org
  const { data: seq } = await supabase
    .from('sequences')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', sequenceId)
    .single();

  if (!seq) return { data: null, error: new Error('Sequence not found') };

  // Get first step
  const { data: firstStep } = await supabase
    .from('sequence_steps')
    .select('id')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .insert({
      sequence_id: sequenceId,
      contact_id: contactId,
      lead_id: leadId ?? null,
      current_step_id: firstStep?.id ?? null,
      status: 'active'
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };

  // Update sequence counters
  await supabase.rpc('increment_sequence_counters', { p_sequence_id: sequenceId });

  return { data, error: undefined };
}

export async function pauseEnrollment(supabase: SupabaseClient, organizationId: string, enrollmentId: string) {
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'paused' })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function resumeEnrollment(supabase: SupabaseClient, organizationId: string, enrollmentId: string) {
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'active' })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function stopEnrollment(supabase: SupabaseClient, organizationId: string, enrollmentId: string) {
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'stopped', completed_at: new Date().toISOString() })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function listEnrollments(supabase: SupabaseClient, organizationId: string, sequenceId: string, opts: { status?: string } = {}) {
  let query = supabase
    .from('sequence_enrollments')
    .select('*, email_contacts(email, first_name, last_name)')
    .eq('sequence_id', sequenceId)
    .order('started_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: undefined };
}

// ============================================
// EXECUTION (called by worker)
// ============================================

export async function getNextStep(supabase: SupabaseClient, enrollmentId: string) {
  const { data: enrollment } = await supabase
    .from('sequence_enrollments')
    .select('current_step_id, sequence_id')
    .eq('id', enrollmentId)
    .single();

  if (!enrollment || !enrollment.current_step_id) return { data: null, error: new Error('Enrollment not found or no current step') };

  const { data: currentStep } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('id', enrollment.current_step_id)
    .single();

  if (!currentStep) return { data: null, error: new Error('Current step not found') };

  // Find next step
  const { data: nextStep } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', enrollment.sequence_id)
    .gt('position', currentStep.position)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  return { data: { currentStep, nextStep }, error: undefined };
}

export async function advanceEnrollment(supabase: SupabaseClient, enrollmentId: string, nextStepId?: string) {
  const updates: Record<string, unknown> = {};
  
  if (nextStepId) {
    updates.current_step_id = nextStepId;
  } else {
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update(updates)
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: undefined };
}

export async function getNextSequence(
  supabase: SupabaseClient,
  organizationId: string,
  prefix: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_sequence', { 
    p_organization_id: organizationId, 
    p_prefix: prefix 
  });
  
  if (error) throw new Error(error.message);
  return data;
}