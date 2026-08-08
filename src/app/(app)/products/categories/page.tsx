'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, FolderTree, Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading, Spinner } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');

  function load() {
    api<{ data: Category[] }>('/api/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load categories'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory() {
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      await api('/api/categories', {
        method: 'POST',
        body: { name, parentId: parentId || null, description: description || null }
      });
      toast.success('Category created');
      setName('');
      setDescription('');
      setParentId('');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    try {
      await api(`/api/categories/${id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }

  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Organize your products into categories and sub-categories">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a category to organize your products.</DialogDescription>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name *</Label>
                <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spices" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-parent">Parent Category</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="cat-parent"><SelectValue placeholder="None (top level)" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea id="cat-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createCategory} disabled={saving}>
                {saving && <LoaderSmall />}
                <Save className="h-4 w-4" />
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {loading ? (
        <Loading label="Loading categories..." />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create categories and sub-categories to organize your products."
          icon={FolderTree}
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Category</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.filter((c) => !c.parent_id).map((category) => (
            <Card key={category.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{category.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {category.description && <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>}
                {childrenOf(category.id).length > 0 && (
                  <ul className="mt-3 space-y-1 border-t pt-3">
                    {childrenOf(category.id).map((child) => (
                      <li key={child.id} className="flex items-center justify-between text-sm">
                        <span>{child.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCategory(child.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LoaderSmall() {
  return <Spinner className="h-4 w-4" />;
}