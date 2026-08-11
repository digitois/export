'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Play, Save, Trash2, Plus, Settings, ChevronRight,
  Mail, Users, FileText, Clock, Globe, Webhook, Zap
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'integration' | 'end';
  actionType?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  label: string;
}

interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: Record<string, unknown>;
  label?: string;
}

interface Workflow {
  id?: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
}

interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave: (workflow: Workflow) => void;
  onCancel?: () => void;
}

const nodeTypes = [
  { type: 'trigger', icon: Zap, label: 'Trigger', color: 'bg-purple-500' },
  { type: 'action', icon: Mail, label: 'Action', color: 'bg-blue-500' },
  { type: 'condition', icon: FileText, label: 'Condition', color: 'bg-yellow-500' },
  { type: 'delay', icon: Clock, label: 'Delay', color: 'bg-orange-500' },
  { type: 'integration', icon: Globe, label: 'Integration', color: 'bg-green-500' },
  { type: 'end', icon: ChevronRight, label: 'End', color: 'bg-gray-500' },
];

const actionTypes = [
  { type: 'send_email', label: 'Send Email', icon: Mail },
  { type: 'add_to_list', label: 'Add to List', icon: Users },
  { type: 'update_lead', label: 'Update Lead', icon: FileText },
  { type: 'create_task', label: 'Create Task', icon: Settings },
  { type: 'notify_team', label: 'Notify Team', icon: Users },
  { type: 'send_sms', label: 'Send SMS', icon: Mail },
  { type: 'send_whatsapp', label: 'Send WhatsApp', icon: Mail },
  { type: 'webhook_call', label: 'Webhook Call', icon: Webhook },
];

const triggerTypes = [
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'lead_status_changed', label: 'Lead Status Changed' },
  { value: 'lead_converted', label: 'Lead Converted' },
  { value: 'lead_lost', label: 'Lead Lost' },
  { value: 'inquiry_received', label: 'Inquiry Received' },
  { value: 'document_sent', label: 'Document Sent' },
  { value: 'invoice_due', label: 'Invoice Due' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'website_event', label: 'Website Event' },
  { value: 'time_based', label: 'Time Based' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'manual', label: 'Manual' },
];

export function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [workflowData, setWorkflowData] = useState<Workflow>(
    workflow || {
      name: '',
      description: '',
      triggerType: 'lead_created',
      triggerConfig: {},
      nodes: [],
      edges: [],
      isActive: true
    }
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = workflowData.nodes.find(n => n.id === selectedNodeId);

  const addNode = useCallback((nodeType: WorkflowNode['type'], position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position,
      config: {},
      label: nodeTypes.find(nt => nt.type === nodeType)?.label || nodeType
    };

    setWorkflowData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
    setShowNodeMenu(false);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflowData(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    }));
    setSelectedNodeId(null);
  }, []);

  const addEdge = useCallback((fromNodeId: string, toNodeId: string) => {
    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      from: fromNodeId,
      to: toNodeId
    };

    setWorkflowData(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      edges: prev.edges.filter(edge => edge.id !== edgeId)
    }));
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedNodeId(null);
      if (showNodeMenu) {
        setShowNodeMenu(false);
      }
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setIsDragging(true);
    setDraggedNodeId(nodeId);

    const node = workflowData.nodes.find(n => n.id === nodeId);
    if (node) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedNodeId && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newPosition = {
        x: e.clientX - canvasRect.left - dragOffset.x,
        y: e.clientY - canvasRect.top - dragOffset.y
      };

      updateNode(draggedNodeId, { position: newPosition });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  const handleCanvasRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setNodeMenuPosition({
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top
      });
      setShowNodeMenu(true);
    }
  };

  const handleSave = () => {
    onSave(workflowData);
  };

  const renderNode = (node: WorkflowNode) => {
    const nodeType = nodeTypes.find(nt => nt.type === node.type);
    const isSelected = selectedNodeId === node.id;

    return (
      <div
        key={node.id}
        className={`absolute cursor-move transition-all ${
          isSelected ? 'ring-2 ring-accent z-10' : 'z-0'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          minWidth: '200px'
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
      >
        <Card className={`p-4 ${nodeType?.color} text-white shadow-lg`}>
          <div className="flex items-center gap-2 mb-2">
            {nodeType?.icon && <nodeType.icon className="w-4 h-4" />}
            <span className="font-medium text-sm">{node.label}</span>
          </div>
          {node.actionType && (
            <div className="text-xs opacity-80">
              {actionTypes.find(at => at.type === node.actionType)?.label}
            </div>
          )}
        </Card>
        
        {/* Connection points */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-accent rounded-full cursor-crosshair hover:scale-125 transition-transform" />
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-accent rounded-full cursor-crosshair hover:scale-125 transition-transform" />
      </div>
    );
  };

  const renderEdges = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {workflowData.edges.map(edge => {
          const fromNode = workflowData.nodes.find(n => n.id === edge.from);
          const toNode = workflowData.nodes.find(n => n.id === edge.to);

          if (!fromNode || !toNode) return null;

          const fromX = fromNode.position.x + 200; // Right side of node
          const fromY = fromNode.position.y + 40;  // Middle of node
          const toX = toNode.position.x;           // Left side of node
          const toY = toNode.position.y + 40;      // Middle of node

          const midX = (fromX + toX) / 2;
          const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

          return (
            <g key={edge.id}>
              <path
                d={path}
                fill="none"
                stroke="#64748B"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={midX}
                  y={(fromY + toY) / 2 - 10}
                  textAnchor="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748B" />
          </marker>
        </defs>
      </svg>
    );
  };

  return (
    <div className="flex h-screen bg-canvas">
      {/* Sidebar - Workflow Settings */}
      <div className="w-80 bg-surface border-r border-line p-4 overflow-y-auto">
        <h3 className="font-semibold text-ink mb-4">Workflow Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <Input
              value={workflowData.name}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Workflow name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Input
              value={workflowData.description || ''}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Trigger</label>
            <select
              value={workflowData.triggerType}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, triggerType: e.target.value }))}
              className="w-full p-2 border border-line rounded-lg bg-surface"
            >
              {triggerTypes.map(trigger => (
                <option key={trigger.value} value={trigger.value}>
                  {trigger.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={workflowData.isActive}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-ink">
              Active
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-canvas"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasRightClick}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(to right, #ccc 1px, transparent 1px),
            linear-gradient(to bottom, #ccc 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />

        {/* Edges */}
        {renderEdges()}

        {/* Nodes */}
        {workflowData.nodes.map(renderNode)}

        {/* Node context menu */}
        {showNodeMenu && (
          <div
            className="absolute bg-surface border border-line rounded-lg shadow-lg p-2 z-20"
            style={{
              left: nodeMenuPosition.x,
              top: nodeMenuPosition.y
            }}
          >
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Add Node</div>
            <div className="space-y-1">
              {nodeTypes.map(nodeType => (
                <Button
                  key={nodeType.type}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addNode(nodeType.type, nodeMenuPosition)}
                >
                  <nodeType.icon className="w-4 h-4 mr-2" />
                  {nodeType.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        {workflowData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Right-click to add nodes</p>
              <p className="text-sm">Drag nodes to position them</p>
            </div>
          </div>
        )}
      </div>

      {/* Node Settings Panel */}
      {selectedNode && (
        <div className="w-80 bg-surface border-l border-line p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink">Node Settings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNode(selectedNode)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Node Type</label>
              <p className="text-sm text-ink capitalize">{selectedNode.type}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Label</label>
              <Input
                value={selectedNode.label}
                onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
              />
            </div>

            {selectedNode.type === 'action' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                <select
                  value={selectedNode.actionType || ''}
                  onChange={(e) => updateNode(selectedNode.id, { actionType: e.target.value })}
                  className="w-full p-2 border border-line rounded-lg bg-surface"
                >
                  <option value="">Select action...</option>
                  {actionTypes.map(action => (
                    <option key={action.type} value={action.type}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Additional node-specific configuration can be added here */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Configuration</label>
              <textarea
                value={JSON.stringify(selectedNode.config, null, 2)}
                onChange={(e) => {
                  try {
                    updateNode(selectedNode.id, { config: JSON.parse(e.target.value) });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full h-32 p-2 border border-line rounded-lg bg-surface font-mono text-sm"
                placeholder="{}"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}