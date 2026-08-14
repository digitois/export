'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Plus, Trash2, Workflow, Loader2, Users, Mail, Eye, Power } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Sequence {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  step_count: number;
  enrolled_count: number;
  open_count: number;
  has_active_enrollments: boolean;
  created_at: string;
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    try {
      const res = await api<{ data: Sequence[] }>('/api/email/sequences');
      setSequences(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createSequence(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api('/api/email/sequences', {
        method: 'POST',
        body: { action: 'create', name: name.trim(), description: description.trim() || null }
      });
      toast.success('Sequence created');
      setShowCreate(false);
      setName('');
      setDescription('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create sequence');
    }
  }

  async function toggleActive(seq: Sequence) {
    try {
      await api('/api/email/sequences', {
        method: 'PATCH',
        body: { action: 'update', id: seq.id, updates: { is_active: !seq.is_active } }
      });
      toast.success(seq.is_active ? 'Sequence paused' : 'Sequence activated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update sequence');
    }
  }

  async function deleteSequence(id: string) {
    if (!confirm('Delete this sequence and all its steps?')) return;
    try {
      await api(`/api/email/sequences?id=${id}`, { method: 'DELETE' });
      toast.success('Sequence deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete sequence');
    }
  }

  const totalEnrolled = sequences.reduce((a, s) => a + (s.enrolled_count ?? 0), 0);
  const totalOpens = sequences.reduce((a, s) => a + (s.open_count ?? 0), 0);
  const activeCount = sequences.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Sequences" description="Multi-step automated outreach with delays and follow-ups.">
        <Button onClick={() => setShowCreate(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> New Sequence
        </Button>
      </PageHeader>

      {showCreate && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createSequence} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="seq-name">Sequence Name</Label>
                  <Input id="seq-name" value={name} onChange={e => setName(e.target.value)} placeholder="Outreach for US buyers" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="seq-desc">Description (optional)</Label>
                  <Input id="seq-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this sequence achieves" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Sequences" value={sequences.length} icon={Workflow} description="Total created" />
            <StatCard title="Active" value={activeCount} icon={Power} description="Currently running" />
            <StatCard title="Enrolled" value={totalEnrolled} icon={Users} description="Contacts in sequences" />
            <StatCard title="Opens" value={totalOpens} icon={Eye} description="Across sequences" />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {sequences.length ? sequences.map(seq => (
                  <div key={seq.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/email/sequences/${seq.id}`} className="text-sm font-medium hover:text-primary">
                        {seq.name}
                      </Link>
                      {seq.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{seq.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {seq.step_count} steps · {seq.enrolled_count} enrolled · {formatDate(seq.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={seq.is_active ? 'default' : 'secondary'}>{seq.is_active ? 'Active' : 'Paused'}</Badge>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/email/sequences/${seq.id}`}><Mail className="mr-1 h-3.5 w-3.5" /> Build</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(seq)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteSequence(seq.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-8">
                    <EmptyState icon={Workflow} title="No sequences yet" description="Create a sequence to automate multi-step outreach." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}