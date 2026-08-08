'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Newspaper, Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate, slugify } from '@/lib/utils';

type PostStatus = 'draft' | 'scheduled' | 'published';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  keyword?: string | null;
  target_country?: string | null;
  target_product?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  status: PostStatus;
  scheduled_for?: string | null;
  content?: string | null;
  created_at: string;
  updated_at?: string | null;
  views?: number | null;
  author_id?: { full_name?: string | null; email?: string | null } | null;
}

interface BlogForm {
  title: string;
  keyword: string;
  targetCountry: string;
  targetProduct: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  scheduledFor: string;
}

const EMPTY_FORM: BlogForm = {
  title: '',
  keyword: '',
  targetCountry: '',
  targetProduct: '',
  seoTitle: '',
  metaDescription: '',
  excerpt: '',
  content: '',
  status: 'draft',
  scheduledFor: ''
};

const STATUS_OPTIONS: Array<{ value: PostStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' }
];

const STATUS_VARIANT: Record<PostStatus, 'outline' | 'warning' | 'success'> = {
  draft: 'outline',
  scheduled: 'warning',
  published: 'success'
};

function toLocalInput(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function postToForm(p: BlogPost): BlogForm {
  return {
    title: p.title,
    keyword: p.keyword ?? '',
    targetCountry: p.target_country ?? '',
    targetProduct: p.target_product ?? '',
    seoTitle: p.seo_title ?? '',
    metaDescription: p.meta_description ?? '',
    excerpt: p.excerpt ?? '',
    content: p.content ?? '',
    status: p.status,
    scheduledFor: toLocalInput(p.scheduled_for)
  };
}

export default function BlogPage() {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, q: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: BlogPost[]; meta: { count: number; page: number; pageSize: number; totalPages: number } }>(
        `/api/blog${getSearchParamString({ page: filters.page, pageSize: filters.pageSize, q: filters.q, status: filters.status })}`
      );
      setItems(res.data);
      setCount(res.meta.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / filters.pageSize));

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm(postToForm(post));
    setDialogOpen(true);
  }

  function setStatus(next: PostStatus) {
    setForm((prev) => ({
      ...prev,
      status: next,
      scheduledFor:
        next === 'scheduled' && !prev.scheduledFor
          ? toLocalInput(new Date(Date.now() + 3600000).toISOString())
          : prev.scheduledFor
    }));
  }

  async function savePost(e: FormEvent) {
    e.preventDefault();
    const body = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      keyword: form.keyword.trim() || null,
      targetCountry: form.targetCountry.trim() || null,
      targetProduct: form.targetProduct.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      content: form.content,
      status: form.status,
      scheduledFor: form.status === 'scheduled' ? fromLocalInput(form.scheduledFor) : null
    };
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/blog/${editing.id}`, { method: 'PATCH', body });
        toast.success('Post updated');
      } else {
        await api('/api/blog', { method: 'POST', body });
        toast.success('Post created');
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: BlogPost) {
    setDeletingConfirm(true);
    try {
      await api(`/api/blog/${post.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeletingConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Blog" description="Write and manage SEO posts for your buyer audience.">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 lg:flex-row">
        <Input
          placeholder="Search posts by title..."
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          className="lg:max-w-sm"
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? '' : v, page: 1 }))}
        >
          <SelectTrigger className="lg:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto self-center text-sm text-muted-foreground">{count} post{count !== 1 && 's'}</p>
      </div>

      {loading ? (
        <Loading label="Loading posts..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No blog posts yet"
          description="Create your first SEO post to start attracting buyers."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Post</Button>}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate font-medium">{post.title}</p>
                    <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[post.status]}>{post.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm">{[post.target_country, post.target_product].filter(Boolean).join(' / ') || '-'}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.author_id?.full_name ?? post.author_id?.email ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(post.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmDelete(post)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {count > filters.pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {filters.page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={savePost} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Post' : 'New Post'}</DialogTitle>
              <DialogDescription>
                {editing ? 'Update the details below and save your changes.' : 'Create a new SEO post for your buyers.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="How to source frozen mangoes from India"
                required
              />
              <p className="text-xs text-muted-foreground">
                Slug will be auto-generated from the title: {slugify(form.title) || '-'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="keyword">Primary Keyword</Label>
                <Input
                  id="keyword"
                  value={form.keyword}
                  onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))}
                  placeholder="frozen mango supplier"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="targetCountry">Target Country</Label>
                <Input
                  id="targetCountry"
                  value={form.targetCountry}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetCountry: e.target.value }))}
                  placeholder="United Arab Emirates"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="targetProduct">Target Product</Label>
                <Input
                  id="targetProduct"
                  value={form.targetProduct}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetProduct: e.target.value }))}
                  placeholder="Frozen mango pulp"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setStatus(v as PostStatus)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={form.seoTitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="Buy Frozen Mango Pulp from Indian Exporters"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Input
                  id="metaDescription"
                  value={form.metaDescription}
                  onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="One or two lines summarizing the post"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  placeholder="Short summary shown in previews and listings"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  placeholder="Full blog post content"
                />
              </div>
            </div>

            {form.status === 'scheduled' && (
              <div className="space-y-1">
                <Label htmlFor="scheduledFor" className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Scheduled For
                </Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Post'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete post</DialogTitle>
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