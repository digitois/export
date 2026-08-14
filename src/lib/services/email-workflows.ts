import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Generic result type for node execution
type NodeResult<T = unknown> = { data: T; error?: never } | { data?: never; error: Error };

// Types for enhanced email workflow system
export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: 'trigger' | 'action' | 'condition' | 'delay' | 'integration' | 'end' | 'drip_sequence' | 'split_path' | 'goal' | 'wait_until' | 'segment';
  action_type?: 'send_email' | 'add_to_list' | 'update_lead' | 'create_task' | 'notify_team' | 'send_sms' | 'send_whatsapp' | 'webhook_call' | 'add_tag' | 'remove_tag' | 'update_contact_score' | 'remove_from_list';
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  parent_id?: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  from_node_id: string;
  to_node_id: string;
  condition: Record<string, unknown>;
  label?: string;
}

export interface EmailWorkflowEnhanced {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  run_count: number;
  last_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  organization_id: string;
  workflow_id: string;
  lead_id?: string;
  contact_id?: string;
  current_node_id?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata: Record<string, unknown>;
}

// Workflow CRUD operations
export async function createWorkflow(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  workflow: Omit<EmailWorkflowEnhanced, 'id' | 'organization_id' | 'run_count' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('email_workflows_enhanced')
    .insert({
      ...workflow,
      organization_id: organizationId,
      created_by: userId,
      run_count: 0
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function getWorkflow(supabase: SupabaseClient, organizationId: string, workflowId: string) {
  const { data, error } = await supabase
    .from('email_workflows_enhanced')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', workflowId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function listWorkflows(supabase: SupabaseClient, organizationId: string, activeOnly = false) {
  let query = supabase
    .from('email_workflows_enhanced')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  
  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  
  return { data: data ?? [], error: undefined };
}

export async function updateWorkflow(
  supabase: SupabaseClient,
  organizationId: string,
  workflowId: string,
  updates: Partial<EmailWorkflowEnhanced>
) {
  const { data, error } = await supabase
    .from('email_workflows_enhanced')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('id', workflowId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function deleteWorkflow(supabase: SupabaseClient, organizationId: string, workflowId: string) {
  const { error } = await supabase
    .from('email_workflows_enhanced')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', workflowId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: undefined };
}

// Workflow Node operations
export async function createWorkflowNode(
  supabase: SupabaseClient,
  workflowId: string,
  node: Omit<WorkflowNode, 'id' | 'workflow_id'>
) {
  const { data, error } = await supabase
    .from('email_workflow_nodes')
    .insert({
      ...node,
      workflow_id: workflowId
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function getWorkflowNodes(supabase: SupabaseClient, workflowId: string) {
  const { data, error } = await supabase
    .from('email_workflow_nodes')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('position_y');

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: data ?? [], error: undefined };
}

export async function updateWorkflowNode(
  supabase: SupabaseClient,
  nodeId: string,
  updates: Partial<WorkflowNode>
) {
  const { data, error } = await supabase
    .from('email_workflow_nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function deleteWorkflowNode(supabase: SupabaseClient, nodeId: string) {
  const { error } = await supabase
    .from('email_workflow_nodes')
    .delete()
    .eq('id', nodeId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: undefined };
}

// Workflow Edge operations
export async function createWorkflowEdge(
  supabase: SupabaseClient,
  workflowId: string,
  edge: Omit<WorkflowEdge, 'id' | 'workflow_id'>
) {
  const { data, error } = await supabase
    .from('email_workflow_edges')
    .insert({
      ...edge,
      workflow_id: workflowId
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: undefined };
}

export async function getWorkflowEdges(supabase: SupabaseClient, workflowId: string) {
  const { data, error } = await supabase
    .from('email_workflow_edges')
    .select('*')
    .eq('workflow_id', workflowId);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return { data: data ?? [], error: undefined };
}

export async function deleteWorkflowEdge(supabase: SupabaseClient, edgeId: string) {
  const { error } = await supabase
    .from('email_workflow_edges')
    .delete()
    .eq('id', edgeId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: undefined };
}

// Get complete workflow with nodes and edges
export async function getWorkflowWithNodes(supabase: SupabaseClient, organizationId: string, workflowId: string) {
  const { data: workflow, error: workflowError } = await getWorkflow(supabase, organizationId, workflowId);
  if (workflowError) return { data: null, error: workflowError };

  const { data: nodes, error: nodesError } = await getWorkflowNodes(supabase, workflowId);
  if (nodesError) return { data: null, error: nodesError };

  const { data: edges, error: edgesError } = await getWorkflowEdges(supabase, workflowId);
  if (edgesError) return { data: null, error: edgesError };

  return {
    data: {
      ...workflow,
      nodes,
      edges
    },
    error: undefined
  };
}

// Workflow execution
export async function triggerWorkflow(
  supabase: SupabaseClient,
  organizationId: string,
  triggerType: string,
  triggerData: Record<string, unknown>
) {
  // Find active workflows matching the trigger type
  const { data: workflows, error } = await supabase
    .from('email_workflows_enhanced')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (error) return { error: new Error(error.message) };
  if (!workflows || workflows.length === 0) return { data: [], error: undefined };

  const results = [];
  for (const workflow of workflows) {
    // Check if trigger conditions match
    if (workflow.trigger_config && !matchesTriggerConfig(triggerData, workflow.trigger_config)) {
      continue;
    }

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from('email_workflow_runs_enhanced')
      .insert({
        organization_id: organizationId,
        workflow_id: workflow.id,
        lead_id: triggerData.lead_id as string | undefined,
        contact_id: triggerData.contact_id as string | undefined,
        status: 'running',
        metadata: triggerData
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to create workflow run:', runError);
      continue;
    }

    // Execute workflow asynchronously
    executeWorkflow(supabase, organizationId, workflow.id, run.id, triggerData)
      .catch(err => console.error('Workflow execution error:', err));

    // Increment workflow run count
    await supabase.rpc('run_workflow_increment_enhanced', { p_workflow_id: workflow.id });

    results.push({ workflow_id: workflow.id, run_id: run.id });
  }

  return { data: results, error: undefined };
}

async function executeWorkflow(
  supabase: SupabaseClient,
  organizationId: string,
  workflowId: string,
  runId: string,
  triggerData: Record<string, unknown>
) {
  try {
    // Get workflow nodes and edges
    const { data: nodes } = await getWorkflowNodes(supabase, workflowId);
    const { data: edges } = await getWorkflowEdges(supabase, workflowId);

    if (!nodes || !edges) {
      await updateRunStatus(supabase, runId, 'failed', 'Failed to load workflow nodes/edges');
      return;
    }

    // Find trigger node (starting point)
    const triggerNode = nodes.find(n => n.node_type === 'trigger');
    if (!triggerNode) {
      await updateRunStatus(supabase, runId, 'failed', 'No trigger node found');
      return;
    }

    // Execute nodes starting from trigger
    let currentNodeId = triggerNode.id;
    const visitedNodes = new Set<string>();

    while (currentNodeId && !visitedNodes.has(currentNodeId)) {
      visitedNodes.add(currentNodeId);
      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (!currentNode) break;

      // Execute current node
      const executionResult = await executeNode(supabase, organizationId, currentNode, triggerData, runId);

      if (executionResult.error) {
        await updateRunStatus(supabase, runId, 'failed', executionResult.error.message);
        return;
      }

      // Find next node based on edges
      const outgoingEdges = edges.filter(e => e.from_node_id === currentNodeId);
      if (outgoingEdges.length === 0) {
        // No outgoing edges, workflow complete
        break;
      }

      // For now, take the first edge (conditional logic can be added later)
      const nextEdge = outgoingEdges[0];
      currentNodeId = nextEdge.to_node_id;

      // Update current node in run
      await supabase
        .from('email_workflow_runs_enhanced')
        .update({ current_node_id: currentNodeId })
        .eq('id', runId);
    }

    // Mark run as completed
    await updateRunStatus(supabase, runId, 'completed');

  } catch (error) {
    await updateRunStatus(supabase, runId, 'failed', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function executeNode(
  supabase: SupabaseClient,
  organizationId: string,
  node: WorkflowNode,
  triggerData: Record<string, unknown>,
  runId: string
): Promise<NodeResult> {
  // Log step start
  const { data: stepLog } = await supabase
    .from('email_workflow_step_logs')
    .insert({
      run_id: runId,
      node_id: node.id,
      action_type: node.action_type,
      status: 'running',
      input_data: triggerData
    })
    .select()
    .single();

  try {
    let result;

    switch (node.node_type) {
      case 'action':
        result = await executeActionNode(supabase, organizationId, node, triggerData);
        break;
      case 'condition':
        result = await executeConditionNode(node, triggerData);
        break;
      case 'delay':
        result = await executeDelayNode(node);
        break;
      case 'integration':
        result = await executeIntegrationNode(supabase, node, triggerData);
        break;
      default:
        result = { error: new Error(`Unknown node type: ${node.node_type}`) };
    }

    // Update step log
    if (stepLog) {
      await supabase
        .from('email_workflow_step_logs')
        .update({
          status: result.error ? 'failed' : 'completed',
          output_data: result.data,
          error_message: result.error?.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepLog.id);
    }

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (stepLog) {
      await supabase
        .from('email_workflow_step_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepLog.id);
    }

    return { error: new Error(errorMessage) };
  }
}

async function executeActionNode(
  supabase: SupabaseClient,
  organizationId: string,
  node: WorkflowNode,
  triggerData: Record<string, unknown>
): Promise<NodeResult> {
  if (!node.action_type) {
    return { error: new Error('Action node missing action_type') };
  }

  switch (node.action_type) {
    case 'send_email':
      return await executeSendEmail(supabase, organizationId, node.config, triggerData);
    case 'add_to_list':
      return await executeAddToList(supabase, organizationId, node.config, triggerData);
    case 'update_lead':
      return await executeUpdateLead(supabase, organizationId, node.config, triggerData);
    case 'create_task':
      return await executeCreateTask(supabase, organizationId, node.config, triggerData);
    case 'notify_team':
      return await executeNotifyTeam(supabase, organizationId, node.config, triggerData);
    default:
      return { error: new Error(`Unsupported action type: ${node.action_type}`) };
  }
}

async function executeSendEmail(
  supabase: SupabaseClient,
  organizationId: string,
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ messageId: string }>> {
  const templateId = config.template_id as string;
  const to = config.to as string || triggerData.email as string;
  
  if (!templateId || !to) {
    return { error: new Error('Missing template_id or recipient email') };
  }

  // Get template
  const { data: template } = await supabase
    .from('email_templates_enhanced')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { error: new Error('Template not found') };
  }

  // Render template with trigger data
  const subject = renderTemplate(template.subject, triggerData);
  const body = renderTemplate(template.html_content || '', triggerData);

  // Send email
  const result = await sendEmail({
    to,
    subject,
    html: body
  });

  if (result.messageId) {
    // Increment template usage
    await supabase.rpc('increment_template_usage', { p_template_id: templateId });
    
    // Log email activity
    await supabase
      .from('email_activities')
      .insert({
        organization_id: organizationId,
        email: to,
        event: 'sent',
        metadata: { template_id: templateId, workflow: true }
      });

    return { data: { messageId: result.messageId } };
  }

  return { error: new Error('Failed to send email') };
}

async function executeAddToList(
  supabase: SupabaseClient,
  organizationId: string,
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ addedToList: string }>> {
  const listId = config.list_id as string;
  const email = triggerData.email as string;
  const name = triggerData.name as string;

  if (!listId || !email) {
    return { error: new Error('Missing list_id or email') };
  }

  const { error } = await supabase
    .from('email_contacts')
    .upsert({
      organization_id: organizationId,
      email,
      name,
      list_id: listId,
      unsubscribed: false
    }, {
      onConflict: 'organization_id,email'
    });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { data: { addedToList: listId } };
}

async function executeUpdateLead(
  supabase: SupabaseClient,
  organizationId: string,
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ updatedLead: string }>> {
  const leadId = triggerData.lead_id as string;
  const updates = config.updates as Record<string, unknown>;

  if (!leadId || !updates) {
    return { error: new Error('Missing lead_id or updates') };
  }

  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
    .eq('organization_id', organizationId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { data: { updatedLead: leadId } };
}

async function executeCreateTask(
  supabase: SupabaseClient,
  organizationId: string,
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ taskCreated: boolean }>> {
  // Placeholder for task creation logic
  // This would integrate with a tasks system
  return { data: { taskCreated: true } };
}

async function executeNotifyTeam(
  supabase: SupabaseClient,
  organizationId: string,
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ teamNotified: boolean }>> {
  // Placeholder for team notification logic
  // This would integrate with notification system
  return { data: { teamNotified: true } };
}

async function executeConditionNode(
  node: WorkflowNode,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ conditionResult: boolean }>> {
  // Evaluate condition based on node config
  const condition = node.config.condition as Record<string, unknown>;
  const result = evaluateCondition(condition, triggerData);
  
  return { data: { conditionResult: result } };
}

async function executeDelayNode(node: WorkflowNode): Promise<NodeResult<{ delayed: number }>> {
  const delayMs = (node.config.delay as number) * 1000 || 5000;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  return { data: { delayed: delayMs } };
}

async function executeIntegrationNode(
  supabase: SupabaseClient,
  node: WorkflowNode,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ webhookExecuted: boolean; status: number }>> {
  // Placeholder for external integrations
  const integrationType = node.config.integration_type as string;
  
  switch (integrationType) {
    case 'webhook':
      return await executeWebhook(node.config, triggerData);
    default:
      return { error: new Error(`Unsupported integration: ${integrationType}`) };
  }
}

async function executeWebhook(
  config: Record<string, unknown>,
  triggerData: Record<string, unknown>
): Promise<NodeResult<{ webhookExecuted: boolean; status: number }>> {
  const url = config.url as string;
  const method = (config.method as string) || 'POST';
  
  if (!url) {
    return { error: new Error('Missing webhook URL') };
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(triggerData)
    });

    if (!response.ok) {
      return { error: new Error(`Webhook failed with status ${response.status}`) };
    }

    return { data: { webhookExecuted: true, status: response.status } };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Webhook execution failed') };
  }
}

function matchesTriggerConfig(triggerData: Record<string, unknown>, triggerConfig: Record<string, unknown>): boolean {
  // Simple matching logic - can be enhanced
  for (const [key, value] of Object.entries(triggerConfig)) {
    if (triggerData[key] !== value) {
      // Check if it's an array of allowed values
      if (Array.isArray(value) && !value.includes(triggerData[key])) {
        return false;
      }
      return false;
    }
  }
  return true;
}

function evaluateCondition(condition: Record<string, unknown>, data: Record<string, unknown>): boolean {
  // Simple condition evaluation - can be enhanced
  const field = condition.field as string;
  const operator = condition.operator as string;
  const value = condition.value;

  const dataValue = data[field];

  switch (operator) {
    case 'equals':
      return dataValue === value;
    case 'not_equals':
      return dataValue !== value;
    case 'contains':
      return typeof dataValue === 'string' && dataValue.includes(value as string);
    case 'greater_than':
      return typeof dataValue === 'number' && dataValue > (value as number);
    case 'less_than':
      return typeof dataValue === 'number' && dataValue < (value as number);
    default:
      return false;
  }
}

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => 
    vars[key] !== undefined ? String(vars[key]) : match
  );
}

async function updateRunStatus(
  supabase: SupabaseClient,
  runId: string,
  status: 'running' | 'completed' | 'failed' | 'paused',
  errorMessage?: string
) {
  await supabase
    .from('email_workflow_runs_enhanced')
    .update({
      status,
      error_message: errorMessage,
      completed_at: status !== 'running' ? new Date().toISOString() : null
    })
    .eq('id', runId);
}

// Get workflow runs
export async function getWorkflowRuns(
  supabase: SupabaseClient,
  organizationId: string,
  workflowId?: string,
  limit = 50
) {
  let query = supabase
    .from('email_workflow_runs_enhanced')
    .select('*')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;
  return { data: data ?? [], error };
}

// Get workflow step logs
export async function getWorkflowStepLogs(
  supabase: SupabaseClient,
  runId: string
) {
  const { data, error } = await supabase
    .from('email_workflow_step_logs')
    .select('*')
    .eq('run_id', runId)
    .order('started_at', { ascending: true });

  return { data: data ?? [], error };
}