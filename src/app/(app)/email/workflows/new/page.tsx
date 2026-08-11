'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBuilder } from '@/components/email/workflow-builder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (workflow: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/email/workflows/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          trigger_type: workflow.triggerType,
          trigger_config: workflow.triggerConfig,
          is_active: workflow.isActive
        })
      });

      if (response.ok) {
        const result = await response.json();
        const workflowId = result.data.id;

        // Save nodes and edges
        if (workflow.nodes.length > 0) {
          await Promise.all(workflow.nodes.map((node: any) =>
            fetch('/api/email/workflows/nodes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workflow_id: workflowId,
                node_type: node.type,
                action_type: node.actionType,
                position_x: node.position.x,
                position_y: node.position.y,
                config: node.config,
                parent_id: node.parentId
              })
            })
          ));
        }

        if (workflow.edges.length > 0) {
          await Promise.all(workflow.edges.map((edge: any) =>
            fetch('/api/email/workflows/edges', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workflow_id: workflowId,
                from_node_id: edge.from,
                to_node_id: edge.to,
                condition: edge.condition,
                label: edge.label
              })
            })
          ));
        }

        router.push('/email/workflows');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="h-screen">
      <WorkflowBuilder onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}