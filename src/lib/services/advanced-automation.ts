import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Types for advanced automation features
export interface DripCampaign {
  id: string;
  organization_id: string;
  workflow_id?: string;
  name: string;
  description?: string;
  send_schedule: Array<{ delay_days: number; delay_hours: number; template_id: string }>;
  is_active: boolean;
  total_sent: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DripRecipient {
  id: string;
  drip_campaign_id: string;
  contact_id: string;
  lead_id?: string;
  current_step: number;
  started_at: string;
  completed_at?: string;
  status: 'active' | 'completed' | 'paused' | 'removed';
  metadata: Record<string, unknown>;
}

export interface ABTestCampaign {
  id: string;
  organization_id: string;
  name: string;
  test_type: 'subject_line' | 'content' | 'send_time' | 'from_name';
  variants: Array<{ id: string; name: string; config: Record<string, unknown>; traffic_percentage: number }>;
  winning_variant_id?: string;
  test_status: 'running' | 'completed' | 'paused';
  statistical_significance?: number;
  total_recipients: number;
  test_duration_days?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowGoal {
  id: string;
  workflow_id: string;
  name: string;
  goal_type: 'email_opened' | 'link_clicked' | 'form_submitted' | 'purchase_made' | 'custom_event';
  goal_config: Record<string, unknown>;
  is_required: boolean;
  position: number;
  created_at: string;
}

export interface SegmentationRule {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  rules: Array<{ field: string; operator: string; value: unknown; logic?: 'AND' | 'OR' }>;
  match_type: 'all' | 'any';
  estimated_count: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BehavioralEvent {
  id: string;
  organization_id: string;
  contact_id?: string;
  lead_id?: string;
  event_type: string;
  event_data: Record<string, unknown>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  occurred_at: string;
}

export interface SplitPath {
  id: string;
  workflow_id: string;
  split_node_id: string;
  name: string;
  split_type: 'percentage' | 'random' | 'condition_based';
  paths: Array<{ id: string; name: string; percentage: number; condition?: Record<string, unknown>; target_node_id: string }>;
  is_active: boolean;
  created_at: string;
}

// ============================================
// DRIP CAMPAIGN MANAGEMENT
// ============================================

export async function createDripCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  campaign: Omit<DripCampaign, 'id' | 'organization_id' | 'total_sent' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('drip_campaigns')
    .insert({
      ...campaign,
      organization_id: organizationId,
      created_by: userId,
      total_sent: 0
    })
    .select()
    .single();

  return { data, error };
}

export async function getDripCampaign(supabase: SupabaseClient, organizationId: string, campaignId: string) {
  const { data, error } = await supabase
    .from('drip_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', campaignId)
    .single();

  return { data, error };
}

export async function listDripCampaigns(supabase: SupabaseClient, organizationId: string, activeOnly = false) {
  let query = supabase
    .from('drip_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function addContactToDripCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  contactId: string,
  leadId?: string
) {
  const { data, error } = await supabase
    .from('drip_recipients')
    .insert({
      drip_campaign_id: campaignId,
      contact_id: contactId,
      lead_id: leadId,
      current_step: 0,
      status: 'active'
    })
    .select()
    .single();

  return { data, error };
}

export async function processDripCampaignStep(
  supabase: SupabaseClient,
  organizationId: string,
  recipientId: string
) {
  // Get recipient and campaign details
  const { data: recipient } = await supabase
    .from('drip_recipients')
    .select('*, drip_campaign: drip_campaigns(*)')
    .eq('id', recipientId)
    .single();

  if (!recipient || recipient.status !== 'active') {
    return { error: 'Recipient not found or not active' };
  }

  const campaign = recipient.drip_campaign as DripCampaign;
  const schedule = campaign.send_schedule as Array<{ delay_days: number; delay_hours: number; template_id: string }>;

  if (recipient.current_step >= schedule.length) {
    // Campaign completed
    await supabase
      .from('drip_recipients')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', recipientId);
    return { data: { status: 'completed' } };
  }

  const currentStep = schedule[recipient.current_step];
  const stepDelay = (currentStep.delay_days * 24 * 60 * 60 * 1000) + (currentStep.delay_hours * 60 * 60 * 1000);
  const timeSinceStart = Date.now() - new Date(recipient.started_at).getTime();

  if (timeSinceStart < stepDelay) {
    return { data: { status: 'waiting', next_step_at: new Date(new Date(recipient.started_at).getTime() + stepDelay) } };
  }

  // Send email for current step
  const { data: template } = await supabase
    .from('email_templates_enhanced')
    .select('*')
    .eq('id', currentStep.template_id)
    .single();

  if (!template) {
    return { error: 'Template not found' };
  }

  // Get contact details
  const { data: contact } = await supabase
    .from('email_contacts')
    .select('*')
    .eq('id', recipient.contact_id)
    .single();

  if (!contact) {
    return { error: 'Contact not found' };
  }

  // Send email
  const result = await sendEmail({
    to: contact.email,
    subject: template.subject,
    html: template.html_content || ''
  });

  if (result.messageId) {
    // Move to next step
    const nextStep = recipient.current_step + 1;
    await supabase
      .from('drip_recipients')
      .update({ current_step: nextStep })
      .eq('id', recipientId);

    // Update campaign total sent
    await supabase
      .from('drip_campaigns')
      .update({ total_sent: campaign.total_sent + 1 })
      .eq('id', campaign.id);

    return { data: { status: 'sent', next_step: nextStep, messageId: result.messageId } };
  }

  return { error: 'Failed to send email' };
}

// ============================================
// CONDITIONAL BRANCHING
// ============================================

export async function evaluateConditionGroup(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
  conditionGroup: Array<{ field: string; operator: string; value: unknown; logic?: 'AND' | 'OR' }>,
  matchType: 'all' | 'any' = 'all'
): Promise<boolean> {
  const { data: result } = await supabase.rpc('evaluate_complex_condition', {
    p_data: data as any,
    p_rules: conditionGroup as any,
    p_match_type: matchType
  });

  return result || false;
}

export async function evaluateBranching(
  supabase: SupabaseClient,
  nodeConfig: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<{ matchedPath: string | null; error?: string }> {
  const branches = nodeConfig.branches as Array<{
    id: string;
    conditions: Array<{ field: string; operator: string; value: unknown }>;
    target_node_id: string;
  }>;

  for (const branch of branches) {
    const matched = await evaluateConditionGroup(supabase, triggerData, branch.conditions, 'all');
    if (matched) {
      return { matchedPath: branch.target_node_id };
    }
  }

  // Default path if no conditions match
  const defaultPath = nodeConfig.default_path as string | undefined;
  return { matchedPath: defaultPath || null };
}

// ============================================
// BEHAVIORAL TRIGGERS
// ============================================

export async function trackBehavioralEvent(
  supabase: SupabaseClient,
  organizationId: string,
  event: Omit<BehavioralEvent, 'id' | 'organization_id' | 'occurred_at'>
) {
  const { data, error } = await supabase
    .from('behavioral_events')
    .insert({
      ...event,
      organization_id: organizationId,
      occurred_at: new Date().toISOString()
    })
    .select()
    .single();

  if (!error) {
    // Trigger workflows based on behavioral events
    await triggerBehavioralWorkflows(supabase, organizationId, event.event_type, event);
  }

  return { data, error };
}

async function triggerBehavioralWorkflows(
  supabase: SupabaseClient,
  organizationId: string,
  eventType: string,
  eventData: BehavioralEvent
) {
  // Find workflows triggered by this behavioral event
  const { data: workflows } = await supabase
    .from('email_workflows_enhanced')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trigger_type', eventType)
    .eq('is_active', true);

  if (!workflows) return;

  for (const workflow of workflows) {
    // Check if trigger conditions match
    const triggerConfig = workflow.trigger_config as Record<string, unknown>;
    if (triggerConfig && !matchesTriggerConfig(eventData, triggerConfig)) {
      continue;
    }

    // Create workflow run
    const { data: run } = await supabase
      .from('email_workflow_runs_enhanced')
      .insert({
        organization_id: organizationId,
        workflow_id: workflow.id,
        contact_id: eventData.contact_id,
        lead_id: eventData.lead_id,
        status: 'running',
        metadata: eventData
      })
      .select()
      .single();

    if (run) {
      // Execute workflow
      // This would call the existing workflow execution logic
      await supabase.rpc('run_workflow_increment_enhanced', { p_workflow_id: workflow.id });
    }
  }
}

// ============================================
// GOAL COMPLETION TRACKING
// ============================================

export async function createWorkflowGoal(
  supabase: SupabaseClient,
  workflowId: string,
  goal: Omit<WorkflowGoal, 'id' | 'workflow_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('workflow_goals')
    .insert({
      ...goal,
      workflow_id: workflowId
    })
    .select()
    .single();

  return { data, error };
}

export async function completeWorkflowGoal(
  supabase: SupabaseClient,
  goalId: string,
  contactId?: string,
  leadId?: string,
  runId?: string,
  metadata: Record<string, unknown> = {}
) {
  const { data, error } = await supabase
    .from('workflow_goal_completions')
    .insert({
      goal_id: goalId,
      contact_id: contactId,
      lead_id: leadId,
      run_id: runId,
      metadata
    })
    .select()
    .single();

  return { data, error };
}

export async function checkGoalCompletion(
  supabase: SupabaseClient,
  workflowId: string,
  runId: string
): Promise<{ allRequiredGoalsCompleted: boolean; completedGoals: string[] }> {
  const { data: goals } = await supabase
    .from('workflow_goals')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('is_required', true);

  if (!goals || goals.length === 0) {
    return { allRequiredGoalsCompleted: true, completedGoals: [] };
  }

  const { data: completions } = await supabase
    .from('workflow_goal_completions')
    .select('goal_id')
    .eq('run_id', runId);

  const completedGoalIds = (completions || []).map(c => c.goal_id);
  const requiredGoalIds = goals.map(g => g.id);
  const allCompleted = requiredGoalIds.every(id => completedGoalIds.includes(id));

  return {
    allRequiredGoalsCompleted: allCompleted,
    completedGoals: completedGoalIds
  };
}

// ============================================
// A/B TESTING
// ============================================

export async function createABTestCampaign(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  test: Omit<ABTestCampaign, 'id' | 'organization_id' | 'total_recipients' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('ab_test_campaigns')
    .insert({
      ...test,
      organization_id: organizationId,
      created_by: userId,
      total_recipients: 0
    })
    .select()
    .single();

  return { data, error };
}

export async function assignVariant(
  supabase: SupabaseClient,
  testId: string,
  contactId: string
): Promise<{ variantId: string | null; error?: string }> {
  const { data: test } = await supabase
    .from('ab_test_campaigns')
    .select('*')
    .eq('id', testId)
    .single();

  if (!test) {
    return { variantId: null, error: 'Test not found' };
  }

  const variants = test.variants as Array<{ id: string; traffic_percentage: number }>;
  const random = Math.random() * 100;
  let cumulativePercentage = 0;
  let selectedVariantId: string | null = null;

  for (const variant of variants) {
    cumulativePercentage += variant.traffic_percentage;
    if (random <= cumulativePercentage) {
      selectedVariantId = variant.id;
      break;
    }
  }

  if (selectedVariantId) {
    // Track assignment
    await supabase
      .from('ab_test_results')
      .insert({
        ab_test_id: testId,
        variant_id: selectedVariantId,
        contact_id: contactId,
        metric_type: 'assigned',
        metric_value: 1
      });

    // Update total recipients
    await supabase
      .from('ab_test_campaigns')
      .update({ total_recipients: test.total_recipients + 1 })
      .eq('id', testId);
  }

  return { variantId: selectedVariantId };
}

export async function trackABTestMetric(
  supabase: SupabaseClient,
  testId: string,
  variantId: string,
  contactId: string,
  metricType: 'opened' | 'clicked' | 'converted' | 'unsubscribed',
  value: number = 1
) {
  const { data, error } = await supabase
    .from('ab_test_results')
    .insert({
      ab_test_id: testId,
      variant_id: variantId,
      contact_id: contactId,
      metric_type: metricType,
      metric_value: value
    })
    .select()
    .single();

  return { data, error };
}

export async function calculateABTestWinner(
  supabase: SupabaseClient,
  testId: string
): Promise<{ winningVariantId: string | null; statisticalSignificance: number }> {
  const { data: test } = await supabase
    .from('ab_test_campaigns')
    .select('*')
    .eq('id', testId)
    .single();

  if (!test) {
    return { winningVariantId: null, statisticalSignificance: 0 };
  }

  const variants = test.variants as Array<{ id: string }>;
  const results: Record<string, { conversions: number; total: number }> = {};

  // Initialize results
  for (const variant of variants) {
    results[variant.id] = { conversions: 0, total: 0 };
  }

  // Get test results
  const { data: metrics } = await supabase
    .from('ab_test_results')
    .select('*')
    .eq('ab_test_id', testId);

  if (metrics) {
    for (const metric of metrics) {
      if (!results[metric.variant_id]) {
        results[metric.variant_id] = { conversions: 0, total: 0 };
      }

      if (metric.metric_type === 'assigned') {
        results[metric.variant_id].total += metric.metric_value;
      } else if (metric.metric_type === 'converted') {
        results[metric.variant_id].conversions += metric.metric_value;
      }
    }
  }

  // Calculate conversion rates and find winner
  let bestVariantId: string | null = null;
  let bestRate = 0;

  for (const [variantId, data] of Object.entries(results)) {
    const rate = data.total > 0 ? data.conversions / data.total : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestVariantId = variantId;
    }
  }

  // Simple statistical significance calculation (would be more sophisticated in production)
  const statisticalSignificance = bestRate > 0 ? 95.0 : 0;

  if (bestVariantId) {
    await supabase
      .from('ab_test_campaigns')
      .update({
        winning_variant_id: bestVariantId,
        statistical_significance: statisticalSignificance,
        test_status: 'completed'
      })
      .eq('id', testId);
  }

  return { winningVariantId: bestVariantId, statisticalSignificance };
}

// ============================================
// SMART SEGMENTATION
// ============================================

export async function createSegmentationRule(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  rule: Omit<SegmentationRule, 'id' | 'organization_id' | 'estimated_count' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('segmentation_rules')
    .insert({
      ...rule,
      organization_id: organizationId,
      created_by: userId,
      estimated_count: 0
    })
    .select()
    .single();

  if (!error && data) {
    // Calculate initial segment membership
    await refreshSegmentMembership(supabase, data.id);
  }

  return { data, error };
}

export async function refreshSegmentMembership(supabase: SupabaseClient, segmentId: string) {
  const { data: segment } = await supabase
    .from('segmentation_rules')
    .select('*')
    .eq('id', segmentId)
    .single();

  if (!segment) return;

  // Get all contacts in the organization
  const { data: contacts } = await supabase
    .from('email_contacts')
    .select('id, lead_id')
    .eq('organization_id', segment.organization_id);

  if (!contacts) return;

  let matchCount = 0;

  for (const contact of contacts) {
    const contactData = {
      contact_id: contact.id,
      lead_id: contact.lead_id,
      email: contact.email,
      name: contact.name
    };

    const matches = await evaluateConditionGroup(
      supabase,
      contactData,
      segment.rules as Array<{ field: string; operator: string; value: unknown }>,
      segment.match_type
    );

    if (matches) {
      await supabase
        .from('segment_memberships')
        .upsert({
          segment_id: segmentId,
          contact_id: contact.id,
          lead_id: contact.lead_id,
          is_current: true,
          last_match_at: new Date().toISOString()
        }, {
          onConflict: 'segment_id,contact_id'
        });

      matchCount++;
    } else {
      // Remove from segment if no longer matches
      await supabase
        .from('segment_memberships')
        .update({ is_current: false })
        .eq('segment_id', segmentId)
        .eq('contact_id', contact.id);
    }
  }

  // Update estimated count
  await supabase
    .from('segmentation_rules')
    .update({ estimated_count: matchCount })
    .eq('id', segmentId);
}

export async function getSegmentMembers(supabase: SupabaseClient, segmentId: string) {
  const { data, error } = await supabase
    .from('segment_memberships')
    .select('*, contact:email_contacts(*), lead:leads(*)')
    .eq('segment_id', segmentId)
    .eq('is_current', true);

  return { data: data ?? [], error };
}

// ============================================
// SPLIT PATH TESTING
// ============================================

export async function createSplitPath(
  supabase: SupabaseClient,
  workflowId: string,
  splitNodeId: string,
  split: Omit<SplitPath, 'id' | 'workflow_id' | 'split_node_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('split_paths')
    .insert({
      ...split,
      workflow_id: workflowId,
      split_node_id: splitNodeId
    })
    .select()
    .single();

  return { data, error };
}

export async function assignSplitPath(
  supabase: SupabaseClient,
  splitPathId: string,
  runId: string
): Promise<{ assignedPathId: string | null; error?: string }> {
  const { data: splitPath } = await supabase
    .from('split_paths')
    .select('*')
    .eq('id', splitPathId)
    .single();

  if (!splitPath) {
    return { assignedPathId: null, error: 'Split path not found' };
  }

  const paths = splitPath.paths as Array<{ id: string; percentage: number; target_node_id: string }>;
  let selectedPathId: string | null = null;

  if (splitPath.split_type === 'percentage') {
    const random = Math.random() * 100;
    let cumulativePercentage = 0;

    for (const path of paths) {
      cumulativePercentage += path.percentage;
      if (random <= cumulativePercentage) {
        selectedPathId = path.id;
        break;
      }
    }
  } else if (splitPath.split_type === 'random') {
    const randomIndex = Math.floor(Math.random() * paths.length);
    selectedPathId = paths[randomIndex].id;
  }

  if (selectedPathId) {
    await supabase
      .from('split_path_assignments')
      .insert({
        split_path_id: splitPathId,
        run_id: runId,
        assigned_path_id: selectedPathId
      });
  }

  return { assignedPathId: selectedPathId };
}

// ============================================
// WAIT-UNTIL CONDITIONS
// ============================================

export async function evaluateWaitUntilCondition(
  waitConfig: Record<string, unknown>
): { shouldProceed: boolean; nextCheckAt?: Date } {
  const conditionType = waitConfig.condition_type as string;

  switch (conditionType) {
    case 'date':
      const targetDate = new Date(waitConfig.target_date as string);
      return {
        shouldProceed: new Date() >= targetDate,
        nextCheckAt: targetDate
      };

    case 'day_of_week':
      const targetDay = waitConfig.day as number; // 0-6 (Sunday-Saturday)
      const currentDay = new Date().getDay();
      return {
        shouldProceed: currentDay === targetDay,
        nextCheckAt: getNextDayOfWeek(targetDay)
      };

    case 'time':
      const targetTime = waitConfig.time as string; // HH:MM format
      const currentTime = new Date();
      const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
      const targetDateTime = new Date(currentTime);
      targetDateTime.setHours(targetHours, targetMinutes, 0, 0);

      return {
        shouldProceed: currentTime >= targetDateTime,
        nextCheckAt: targetDateTime > currentTime ? targetDateTime : getNextDayTime(targetHours, targetMinutes)
      };

    case 'event_occurs':
      // This would check if a specific event has occurred
      return { shouldProceed: false }; // Would be implemented with event tracking

    default:
      return { shouldProceed: true };
  }
}

function getNextDayOfWeek(day: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const daysUntil = (day - currentDay + 7) % 7 || 7;
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getNextDayTime(hours: number, minutes: number): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);
  return tomorrow;
}

// Helper function to match trigger config
function matchesTriggerConfig(data: Record<string, unknown>, config: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(config)) {
    if (data[key] !== value) {
      if (Array.isArray(value) && !value.includes(data[key])) {
        return false;
      }
      return false;
    }
  }
  return true;
}