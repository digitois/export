'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Download, Building2, MoreHorizontal } from 'lucide-react';
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

interface Buyer {
  id: string;
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  products_interested?: string[];
  notes?: string | null;
  tags?: string[];
  created_at: string;
}

interface BuyerForm {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  city: string;
  address: string;
  productsInterested: string;
  tags: string;
  notes: string;
}

const COUNTRY_OPTIONS = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Netherlands',
  'Italy', 'Spain', 'Australia', 'New Zealand', 'United Arab Emirates', 'Saudi Arabia',
  'India', 'China', 'Japan', 'South Korea', 'Singapore', 'Vietnam', 'Thailand',
  'Indonesia', 'Malaysia', 'Brazil', 'Mexico', 'South Africa', 'Nigeria', 'Poland', 'Turkey'
];

const ALL_COUNTRIES = 'all-countries';

const EMPTY_FORM: BuyerForm = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  country: '',
  city: '',
  address: '',
  productsInterested: '',
  tags: '',
  notes: ''
};

export default function BuyersPage() {
  const [items, setItems] = useState<Buyer[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [country, setCountry] = useState(ALL_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const effectiveCountry = country === ALL_COUNTRIES ? '' : country;

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: Buyer[]; meta: { count: number } }>(
      `/api/buyers${getSearchParamString({ page, pageSize, q: appliedQ, country: effectiveCountry })}`
    )
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setCount(res.meta.count);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load buyers'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedQ, effectiveCountry, reloadKey]);

  async function handleDelete(id: string) {
    const buyer = items.find((b) => b.id === id);
    if (!window.confirm(`Delete buyer "${buyer?.company_name ?? 'this buyer'}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api(`/api/buyers/${id}`, { method: 'DELETE' });
      toast.success('Buyer deleted');
      setItems((prev) => prev.filter((b) => b.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete buyer');
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(buyer: Buyer) {
    setEditing(buyer);
    setShowForm(true);
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const csvHref = `/api/buyers${getSearchParamString({ format: 'csv', q: appliedQ, country: effectiveCountry })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Buyers" description="Your importers, distributors and B2B contacts">
        <Button variant="outline" asChild>
          <a href={csvHref} download>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Buyer
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search by company, contact or email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="md:max-w-sm"
            />
            <Select value={country} onValueChange={(v) => { setCountry(v); setPage(1); }}>
              <SelectTrigger className="md:w-52"><SelectValue placeholder="All countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COUNTRIES}>All countries</SelectItem>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">{count} buyer{count !== 1 && 's'}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Loading label="Loading buyers..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No buyers yet"
          description="Add your first buyer to start tracking export relationships."
          icon={Building2}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Buyer
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((buyer) => (
                  <TableRow key={buyer.id}>
                    <TableCell>
                      <p className="font-medium">{buyer.company_name}</p>
                      {buyer.city && <p className="text-xs text-muted-foreground">{buyer.city}</p>}
                    </TableCell>
                    <TableCell>{buyer.contact_person ?? '-'}</TableCell>
                    <TableCell>{buyer.country ?? '-'}</TableCell>
                    <TableCell>{buyer.email ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {buyer.tags && buyer.tags.length > 0 ? (
                          buyer.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))
                        ) : <span className="text-sm text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(buyer)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive disabled={deleting === buyer.id} onClick={() => handleDelete(buyer.id)}>
                              <Trash2 className="h-4 w-4" /> {deleting === buyer.id ? 'Deleting...' : 'Delete'}
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

      <BuyerFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        buyer={editing}
        onSaved={() => {
          setShowForm(false);
          setEditing(null);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function BuyerFormDialog({
  open,
  onOpenChange,
  buyer,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: Buyer | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BuyerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (buyer) {
      setForm({
        companyName: buyer.company_name,
        contactPerson: buyer.contact_person ?? '',
        email: buyer.email ?? '',
        phone: buyer.phone ?? '',
        website: buyer.website ?? '',
        country: buyer.country ?? '',
        city: buyer.city ?? '',
        address: buyer.address ?? '',
        productsInterested: (buyer.products_interested ?? []).join(', '),
        tags: (buyer.tags ?? []).join(', '),
        notes: buyer.notes ?? ''
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, buyer]);

  const set = (key: keyof BuyerForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      companyName: form.companyName,
      contactPerson: form.contactPerson || null,
      email: form.email.trim() || null,
      phone: form.phone || null,
      website: form.website.trim() || null,
      country: form.country || null,
      city: form.city || null,
      address: form.address || null,
      productsInterested: toList(form.productsInterested),
      tags: toList(form.tags),
      notes: form.notes || null
    };
    setSaving(true);
    try {
      if (buyer) {
        await api(`/api/buyers/${buyer.id}`, { method: 'PATCH', body: payload });
        toast.success('Buyer updated');
      } else {
        await api('/api/buyers', { method: 'POST', body: payload });
        toast.success('Buyer created');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save buyer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{buyer ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
          <DialogDescription>
            {buyer ? 'Update this buyer’s details.' : 'Add a new buyer to your network.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Company Name" required>
              <Input value={form.companyName} onChange={set('companyName')} placeholder="Acme Importers" required />
            </FormField>
            <FormField label="Contact Person">
              <Input value={form.contactPerson} onChange={set('contactPerson')} placeholder="John Doe" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="buyer@example.com" />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Country">
              <Input list="buyer-countries" value={form.country} onChange={set('country')} placeholder="Select or type a country" />
              <datalist id="buyer-countries">
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </FormField>
            <FormField label="City">
              <Input value={form.city} onChange={set('city')} placeholder="Hamburg" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Website">
              <Input type="url" value={form.website} onChange={set('website')} placeholder="https://example.com" />
            </FormField>
            <FormField label="Address">
              <Input value={form.address} onChange={set('address')} placeholder="Street, area..." />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Products Interested">
              <Input value={form.productsInterested} onChange={set('productsInterested')} placeholder="Aluminum, Steel (comma separated)" />
            </FormField>
            <FormField label="Tags">
              <Input value={form.tags} onChange={set('tags')} placeholder="distributor, eu (comma separated)" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Payment terms, preferences, follow-ups..." />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : buyer ? 'Save Changes' : 'Add Buyer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function toList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}