'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Plus, Trash2, Save, Clock, Mail, ArrowUp, ArrowDown,
  Play, Pause
} from 'lucide-react';

interface DripStep {
  id: string;
  delay_days: number;
  delay_hours: number;
  template_id: string;
  template_name?: string;
}

interface DripCampaignBuilderProps {
  campaign?: {
    id?: string;
    name: string;
    description?: string;
    send_schedule: DripStep[];
    is_active: boolean;
  };
  onSave: (campaign: any) => void;
  onCancel?: () => void;
  templates?: Array<{ id: string; name: string; subject: string }>;
}

export function DripCampaignBuilder({ campaign, onSave, onCancel, templates = [] }: DripCampaignBuilderProps) {
  const [campaignData, setCampaignData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    send_schedule: campaign?.send_schedule || [],
    is_active: campaign?.is_active ?? true
  });

  const addStep = useCallback(() => {
    const newStep: DripStep = {
      id: `step-${Date.now()}`,
      delay_days: 1,
      delay_hours: 0,
      template_id: '',
      template_name: ''
    };

    setCampaignData(prev => ({
      ...prev,
      send_schedule: [...prev.send_schedule, newStep]
    }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<DripStep>) => {
    setCampaignData(prev => ({
      ...prev,
      send_schedule: prev.send_schedule.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setCampaignData(prev => ({
      ...prev,
      send_schedule: prev.send_schedule.filter(step => step.id !== stepId)
    }));
  }, []);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setCampaignData(prev => {
      const newSteps = [...prev.send_schedule];
      const [movedStep] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedStep);
      return { ...prev, send_schedule: newSteps };
    });
  }, []);

  const handleSave = () => {
    onSave(campaignData);
  };

  const formatDelay = (days: number, hours: number) => {
    if (days > 0 && hours > 0) {
      return `${days}d ${hours}h`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return 'Immediate';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink mb-2">Drip Campaign Builder</h2>
        <p className="text-muted-foreground">Create automated email sequences with timed follow-ups</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Campaign Name</label>
            <Input
              value={campaignData.name}
              onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Welcome Series for New Leads"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
            <Input
              value={campaignData.description || ''}
              onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for your team"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={campaignData.is_active}
              onChange={(e) => setCampaignData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-ink">
              Campaign Active
            </label>
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">Email Sequence</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Email
          </Button>
        </div>

        {campaignData.send_schedule.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No emails in your sequence yet</p>
            <Button onClick={addStep} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Email
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaignData.send_schedule.map((step, index) => (
              <Card key={step.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    {index < campaignData.send_schedule.length - 1 && (
                      <div className="w-0.5 h-8 bg-line" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Send after:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={step.delay_days}
                          onChange={(e) => updateStep(step.id, { delay_days: parseInt(e.target.value) || 0 })}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={step.delay_hours}
                          onChange={(e) => updateStep(step.id, { delay_hours: parseInt(e.target.value) || 0 })}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                      </div>
                      <span className="text-sm font-medium text-ink">
                        ({formatDelay(step.delay_days, step.delay_hours)})
                      </span>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Template</label>
                      <select
                        value={step.template_id}
                        onChange={(e) => {
                          const selectedTemplate = templates.find(t => t.id === e.target.value);
                          updateStep(step.id, { 
                            template_id: e.target.value,
                            template_name: selectedTemplate?.name 
                          });
                        }}
                        className="w-full p-2 border border-line rounded-lg bg-surface"
                      >
                        <option value="">Select a template...</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name} - {template.subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(index, index - 1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveStep(index, index + 1)}
                      disabled={index === campaignData.send_schedule.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStep(step.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={!campaignData.name || campaignData.send_schedule.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          Save Campaign
        </Button>
      </div>
    </div>
  );
}