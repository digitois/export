'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Upload, FolderPlus, Trash2, FileText, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api, getSearchParamString, ClientApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  document_type: string;
  description?: string | null;
  folder_id?: string | null;
  file_size: number;
  mime_type?: string | null;
  storage_path: string;
  version: number;
  created_at: string;
  uploaded_by?: { full_name?: string; email?: string } | null;
}

interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
}

const DOCUMENT_TYPES = [
  { value: 'iec', label: 'IEC' },
  { value: 'gst', label: 'GST' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' }
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.value, t.label])
);

const ALL_FOLDERS = 'all-folders';

export default function DocumentsPage() {
  const [items, setItems] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [type, setType] = useState('all-types');
  const [folderId, setFolderId] = useState(ALL_FOLDERS);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const effectiveType = type === 'all-types' ? '' : type;
  const effectiveFolder = folderId === ALL_FOLDERS ? '' : folderId;

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ data: Document[]; meta: { count: number } }>(
        `/api/documents${getSearchParamString({ page, pageSize, q: appliedQ, type: effectiveType, folderId: effectiveFolder })}`
      ),
      api<{ data: Folder[] }>('/api/documents/folders')
    ])
      .then(([docs, folderRes]) => {
        if (cancelled) return;
        setItems(docs.data);
        setCount(docs.meta.count);
        setFolders(folderRes.data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedQ, effectiveType, effectiveFolder, reloadKey]);

  async function handleDelete(id: string) {
    const doc = items.find((d) => d.id === id);
    if (!window.confirm(`Delete document "${doc?.name ?? 'this document'}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api(`/api/documents/${id}`, { method: 'DELETE' });
      toast.success('Document deleted');
      setItems((prev) => prev.filter((d) => d.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleting(null);
    }
  }

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="IEC, GST, certifications, invoices and shipping docs">
        <Button variant="outline" onClick={() => setShowFolder(true)}>
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search documents..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-sm"
            />
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
              <SelectTrigger className="md:w-44"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={folderId} onValueChange={(v) => { setFolderId(v); setPage(1); }}>
              <SelectTrigger className="md:w-52"><SelectValue placeholder="All folders" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} document{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading documents..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload your export documents to keep everything organized."
          icon={FileText}
          action={
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate font-medium" title={doc.name}>{doc.name}</p>
                      {doc.description && <p className="truncate text-xs text-muted-foreground">{doc.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[doc.document_type] ?? doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatBytes(doc.file_size)}</TableCell>
                    <TableCell>{doc.folder_id ? (folderMap.get(doc.folder_id) ?? '-') : '-'}</TableCell>
                    <TableCell>{doc.uploaded_by?.full_name ?? doc.uploaded_by?.email ?? '-'}</TableCell>
                    <TableCell className="text-sm">{formatDate(doc.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem destructive disabled={deleting === doc.id} onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === doc.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        folders={folders}
        onUploaded={() => {
          setShowUpload(false);
          setPage(1);
          setReloadKey((k) => k + 1);
        }}
      />

      <NewFolderDialog
        open={showFolder}
        onOpenChange={setShowFolder}
        onCreated={() => {
          setShowFolder(false);
          setPage(1);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  folders,
  onUploaded
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('other');
  const [folderId, setFolderId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setName('');
      setDocType('other');
      setFolderId('');
      setDescription('');
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error('Please choose a file to upload');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name || file.name);
    fd.append('documentType', docType);
    if (description) fd.append('description', description);
    if (folderId) fd.append('folderId', folderId);

    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: fd,
        cache: 'no-store',
        headers: {}
      });
      let payload: { error?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (!res.ok) {
        throw new ClientApiError(payload?.error ?? `Upload failed with status ${res.status}`, res.status);
      }
      toast.success('Document uploaded');
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const dirty = file === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Upload a trade document to your company library.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-1">
            <Label>File</Label>
            <Input
              type="file"
              required
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name) setName(f.name);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IEC Certificate 2026"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger><SelectValue placeholder="No folder" /></SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-desc">Description</Label>
            <Textarea
              id="doc-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this document..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading || dirty}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewFolderDialog({
  open,
  onOpenChange,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setName('');
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api('/api/documents/folders', { method: 'POST', body: { name: name.trim() } });
      toast.success('Folder created');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>Create a folder to organize your documents.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-1">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Compliance"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Folder'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const digits = value >= 100 || i === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}