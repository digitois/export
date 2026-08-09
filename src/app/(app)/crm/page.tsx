'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Users, Bell, Calendar, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface LeadStage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
}

interface LeadRow {
  id: string;
  buyer_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  product_interested?: string | null;
  lead_value?: number | null;
  currency: string;
  source: string;
  priority: string;
  status: string;
  stage_id?: string | null;
  stage?: { id: string; name: string; color: string } | null;
  assigned_to?: string | null;
  created_at: string;
}

export default function CrmKanbanPage() {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api<{ data: LeadStage[] }>('/api/lead-stages'),
      api<{ data: LeadRow[] }>('/api/leads?pageSize=200')
    ])
      .then(([s, l]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setStages(s.value.data);
        if (l.status === 'fulfilled') setLeads(l.value.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const leadsByStage = stages.map((stage) => ({
    ...stage,
    items: leads.filter((lead) => lead.stage_id === stage.id)
  }));

  async function moveLead(leadId: string, targetStageId: string) {
    try {
      await api(`/api/leads/${leadId}`, { method: 'PATCH', body: { stageId: targetStageId } });
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, stage_id: targetStageId } : lead)));
      toast.success('Lead moved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move lead');
    }
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, targetStageId: string) {
    e.preventDefault();
    if (draggingId) moveLead(draggingId, targetStageId);
    setDraggingId(null);
  }

  if (loading) return <Loading label="Loading CRM pipeline..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Pipeline" description="Drag leads across stages to track progress">
        <Button asChild>
          <Link href="/leads/new">
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </Button>
      </PageHeader>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {leadsByStage.map((col) => (
          <div
            key={col.id}
            className="flex w-80 shrink-0 flex-col rounded-xl border border-line bg-canvas/60"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="font-medium">{col.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{col.items.length}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 px-3 pb-3">
              {col.items.map((lead) => (
                <Card
                  key={lead.id}
                  className="group cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/leads/${lead.id}`} className="font-semibold hover:underline">
                        {lead.buyer_name}
                      </Link>
                    </div>
                    {lead.company_name && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">{lead.company_name}</p>
                    )}
                    {lead.product_interested && (
                      <p className="mt-1 text-xs text-muted-foreground">{lead.product_interested}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {lead.source} · {lead.priority}
                      </span>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {stages.filter((s) => s.id !== lead.stage_id).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => moveLead(lead.id, s.id)}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            s.is_won ? 'bg-pos/25 hover:bg-pos' :
                            s.is_lost ? 'bg-neg/25 hover:bg-neg' :
                            'bg-muted-foreground/20 hover:bg-info'
                          )}
                          title={`Move to ${s.name}`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {col.items.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}