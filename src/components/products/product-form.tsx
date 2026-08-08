'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { productSchema } from '@/lib/validations';
import { CURRENCIES, PRODUCT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadButton } from '@/components/upload-input';
import { Spinner } from '@/components/loading';
import { HsnAutocomplete } from '@/components/hsn-autocomplete';

type ProductInput = z.infer<typeof productSchema>;

const STATUS_OPTIONS = PRODUCT_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

export interface ProductFormProps {
  productId?: string;
}

interface Category {
  id: string;
  name: string;
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      categoryId: null,
      sku: '',
      hsnCode: '',
      description: '',
      technicalSpecifications: {},
      packagingDetails: '',
      moq: '',
      leadTime: '',
      price: null,
      currency: 'USD',
      unit: 'pcs',
      status: 'draft',
      metaTitle: '',
      metaDescription: '',
      featured: false,
      variants: [],
      media: []
    }
  });

  const variants = useFieldArray({ control: form.control, name: 'variants' });
  const media = useFieldArray({ control: form.control, name: 'media' });

  useEffect(() => {
    api<{ data: Category[] }>('/api/categories')
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    api<{ data: Record<string, unknown> }>(`/api/products/${productId}`)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        form.reset({
          name: String(d.name ?? ''),
          categoryId: d.category_id ? String(d.category_id) : null,
          sku: d.sku != null ? String(d.sku) : '',
          hsnCode: d.hsn_code != null ? String(d.hsn_code) : '',
          description: d.description != null ? String(d.description) : '',
          technicalSpecifications: (d.technical_specifications as Record<string, string>) ?? {},
          packagingDetails: d.packaging_details != null ? String(d.packaging_details) : '',
          moq: d.moq != null ? String(d.moq) : '',
          leadTime: d.lead_time != null ? String(d.lead_time) : '',
          price: d.price != null ? Number(d.price) : null,
          currency: String(d.currency ?? 'USD'),
          unit: d.unit != null ? String(d.unit) : 'pcs',
          status: (d.status as ProductInput['status']) ?? 'draft',
          metaTitle: d.meta_title != null ? String(d.meta_title) : '',
          metaDescription: d.meta_description != null ? String(d.meta_description) : '',
          featured: Boolean(d.featured),
          variants: (d.variants as Array<Record<string, unknown>> ?? []).map((v) => ({
            id: v.id != null ? String(v.id) : undefined,
            name: String(v.name ?? ''),
            sku: v.sku != null ? String(v.sku) : null,
            price: v.price != null ? Number(v.price) : null,
            attributes: (v.attributes as Record<string, string>) ?? {},
            isDefault: Boolean(v.is_default)
          })),
          media: (d.media as Array<Record<string, unknown>> ?? []).map((m) => ({
            id: m.id != null ? String(m.id) : undefined,
            type: (m.type as 'image' | 'video') ?? 'image',
            url: String(m.url ?? ''),
            altText: m.alt_text != null ? String(m.alt_text) : null
          }))
        });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, form]);

  async function generateDescription() {
    const name = form.watch('name');
    const description = form.watch('description');
    if (!name) {
      toast.error('Enter a product name first');
      return;
    }
    setAiBusy(true);
    try {
      const res = await api<{ data: { result: string } }>('/api/ai/assist', {
        method: 'POST',
        body: { type: 'product_description', data: { productName: name, description } }
      });
      const text = res.data.result;
      form.setValue('description', (form.getValues('description') || '') + (text ? `\n\n${text}` : ''));
      toast.success('AI description generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(values: ProductInput) {
    setSaving(true);
    try {
      const path = productId ? `/api/products/${productId}` : '/api/products';
      const method = productId ? 'PATCH' : 'POST';
      await api(path, { method, body: values });
      toast.success(productId ? 'Product updated' : 'Product created');
      router.push('/products');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
          <CardDescription>Core details for your product catalog and website.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" placeholder="e.g. Premium Turmeric Powder" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select value={form.watch('categoryId') ?? ''} onValueChange={(v) => form.setValue('categoryId', v || null)}>
              <SelectTrigger id="categoryId"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...form.register('sku')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsnCode">HSN Code</Label>
            <HsnAutocomplete
              value={form.watch('hsnCode') ?? ''}
              onChange={(v) => form.setValue('hsnCode', v || null)}
              placeholder="Search name or type code, e.g. 09103010"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Base Price</Label>
            <Input id="price" type="number" min={0} step="0.01" {...form.register('price', { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={form.watch('currency')} onValueChange={(v) => form.setValue('currency', v)}>
              <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="pcs, kg, tons..." {...form.register('unit')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as ProductInput['status'])}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button type="button" variant="outline" size="sm" disabled={aiBusy} onClick={generateDescription}>
                {aiBusy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                AI Generate
              </Button>
            </div>
            <Textarea id="description" rows={6} placeholder="Describe your product..." {...form.register('description')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trade & Packaging</CardTitle>
          <CardDescription>Details buyers and customs need.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="moq">MOQ (Minimum Order Quantity)</Label>
            <Input id="moq" placeholder="e.g. 1000 kg" {...form.register('moq')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadTime">Lead Time</Label>
            <Input id="leadTime" placeholder="e.g. 15-20 days" {...form.register('leadTime')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="packagingDetails">Packaging Details</Label>
            <Textarea id="packagingDetails" rows={3} placeholder="Packaging, carton weight, export packing..." {...form.register('packagingDetails')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Product Images & Videos</CardTitle>
            <CardDescription>Shown on your export website.</CardDescription>
          </div>
          <UploadButton
            bucket="products"
            accept="image/*"
            label="Upload"
            onUploaded={(url) => media.append({ type: 'image', url, altText: form.watch('name') })}
          />
        </CardHeader>
        <CardContent>
          {media.fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No media yet. Upload product images.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {media.fields.map((field, index) => (
                <div key={field.id} className="group relative overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={field.url}
                    alt={field.altText ?? 'Product media'}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => media.remove(index)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variants</CardTitle>
          <CardDescription>Optional size, color, grade variants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
              <Input placeholder="Name" {...form.register(`variants.${index}.name`)} />
              <Input placeholder="SKU" {...form.register(`variants.${index}.sku`)} />
              <Input
                placeholder="Price"
                type="number"
                min={0}
                step="0.01"
                {...form.register(`variants.${index}.price`, { valueAsNumber: true })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.watch(`variants.${index}.isDefault`)} onCheckedChange={(v) => form.setValue(`variants.${index}.isDefault`, v)} />
                Default
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => variants.remove(index)}
                className="justify-start text-destructive md:justify-center"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => variants.append({ name: '', sku: '', price: null, attributes: {}, isDefault: false })}>
            <Plus className="h-4 w-4" /> Add Variant
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>Improve discoverability of this product page.</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.watch('featured')} onCheckedChange={(v) => form.setValue('featured', v)} />
              Featured
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input id="metaTitle" {...form.register('metaTitle')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea id="metaDescription" rows={2} {...form.register('metaDescription')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technicalSpecifications">Technical Specifications</Label>
            <SpecsEditor
              value={form.watch('technicalSpecifications')}
              onChange={(v) => form.setValue('technicalSpecifications', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save className="h-4 w-4" />}
          {productId ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}

function SpecsEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');
  function add() {
    const k = key.trim();
    if (!k) return;
    onChange({ ...value, [k]: val.trim() });
    setKey('');
    setVal('');
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Property" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input placeholder="Value" value={val} onChange={(e) => setVal(e.target.value)} />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
      {Object.keys(value).length > 0 && (
        <div className="grid gap-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{k}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{v}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    const next = { ...value };
                    delete next[k];
                    onChange(next);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}