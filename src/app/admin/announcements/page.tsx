'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Megaphone, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  body?: string | null;
  level: string;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
}

const LEVEL_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  info: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'destructive'
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', level: 'info', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: Announcement[] }>('/api/admin/announcements');
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAnnouncement(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/admin/announcements', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          body: form.body.trim() || null,
          level: form.level,
          isActive: form.isActive
        }
      });
      toast.success('Announcement created');
      setDialogOpen(false);
      setForm({ title: '', body: '', level: 'info', isActive: true });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(announcement: Announcement) {
    setToggling(announcement.id);
    try {
      await api(`/api/admin/announcements/${announcement.id}`, {
        method: 'PATCH',
        body: { isActive: !announcement.is_active }
      });
      toast.success(announcement.is_active ? 'Announcement hidden' : 'Announcement published');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement');
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(announcement: Announcement) {
    setDeletingConfirm(true);
    try {
      await api(`/api/admin/announcements/${announcement.id}`, { method: 'DELETE' });
      toast.success('Announcement deleted');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    } finally {
      setDeletingConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Broadcast platform-wide notices to all users.">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </PageHeader>

      {loading ? (
        <Loading label="Loading announcements..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Create your first platform-wide announcement."
          icon={Megaphone}
          action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Announcement</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell className="font-medium">{announcement.title}</TableCell>
                <TableCell><Badge variant={LEVEL_VARIANT[announcement.level] ?? 'secondary'}>{announcement.level}</Badge></TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground">{announcement.body ?? '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(announcement.created_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Switch
                      checked={announcement.is_active}
                      disabled={toggling === announcement.id}
                      onCheckedChange={() => toggleActive(announcement)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmDelete(announcement)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={createAnnouncement} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New Announcement</DialogTitle>
              <DialogDescription>Broadcast a notice to every user of the platform.</DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="level">Level</Label>
              <div className="flex gap-2">
                {['info', 'success', 'warning', 'danger'].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    size="sm"
                    variant={form.level === level ? 'default' : 'outline'}
                    onClick={() => setForm((f) => ({ ...f, level }))}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Immediately visible to users</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete announcement</DialogTitle>
            <DialogDescription>
              "{confirmDelete?.title}" will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deletingConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={deletingConfirm}>
              {deletingConfirm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}