'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { companyProfileSchema } from '@/lib/validations';
import { COUNTRIES } from '@/lib/constants';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadInput } from '@/components/upload-input';
import { Spinner } from '@/components/loading';

type Profile = z.infer<typeof companyProfileSchema>;

function TagField({
  id,
  label,
  values,
  onChange,
  placeholder
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft('');
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value, idx) => (
            <span key={`${value}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
              {value}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<Profile>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: '',
      certifications: [],
      exportMarkets: [],
      productCategories: [],
      socialLinks: {}
    }
  });

  useEffect(() => {
    api<{ data: Profile }>('/api/company')
      .then((res) => {
        if (res.data) {
          form.reset(res.data);
        }
      })
      .catch(() => toast.error('Failed to load company profile'))
      .finally(() => setLoading(false));
  }, [form]);

  const socialLinks = form.watch('socialLinks') ?? {};

  function setSocialLink(key: string, value: string) {
    const next = { ...socialLinks };
    if (value.trim()) next[key] = value.trim();
    else delete next[key];
    form.setValue('socialLinks', next);
  }

  async function onSubmit(values: Profile) {
    setSaving(true);
    try {
      await api('/api/company', { method: 'PUT', body: values });
      toast.success('Company profile updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading className="min-h-[60vh]" label="Loading company profile..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" description="Your business information shown on your export website and documents">
        <Button form="company-form" type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </PageHeader>

      <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Company details used across quotations, invoices and your website.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" placeholder="Sharma Exports Pvt. Ltd." {...form.register('companyName')} />
              {form.formState.errors.companyName && (
                <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" placeholder="Premium Indian Spices Imported Worldwide" {...form.register('tagline')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={form.watch('businessType') ?? ''}
                onValueChange={(v) => form.setValue('businessType', v)}
              >
                <SelectTrigger id="businessType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="merchant_exporter">Merchant Exporter</SelectItem>
                  <SelectItem value="trader">Trader</SelectItem>
                  <SelectItem value="export_house">Export House</SelectItem>
                  <SelectItem value="sourcing">Sourcing Company</SelectItem>
                  <SelectItem value="consultancy">Consultancy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearEstablished">Year Established</Label>
              <Input id="yearEstablished" type="number" placeholder="2010" {...form.register('yearEstablished')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Employee Count</Label>
              <Input id="employeeCount" placeholder="e.g. 51-200" {...form.register('employeeCount')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="about">About</Label>
              <Textarea id="about" rows={5} placeholder="Describe your company..." {...form.register('about')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration Details</CardTitle>
            <CardDescription>Required for export documents and customs clearance.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input id="gstNumber" placeholder="GSTIN" {...form.register('gstNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iecNumber">IEC Number</Label>
              <Input id="iecNumber" placeholder="IEC Code" {...form.register('iecNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input id="panNumber" placeholder="PAN" {...form.register('panNumber')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Address</CardTitle>
            <CardDescription>Where buyers can reach you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" {...form.register('contactPerson')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" {...form.register('whatsapp')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://..." {...form.register('website')} />
              {form.formState.errors.website && (
                <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.website.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select name="country" value={form.watch('country') ?? ''} onValueChange={(v) => form.setValue('country', v)}>
                <SelectTrigger id="country"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="India">India</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...form.register('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" {...form.register('pincode')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input id="addressLine1" placeholder="Street address" {...form.register('addressLine1')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input id="addressLine2" {...form.register('addressLine2')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="factoryAddress">Factory Address</Label>
              <Input id="factoryAddress" {...form.register('factoryAddress')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Profile</CardTitle>
            <CardDescription>Attract the right buyers by highlighting what you export.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <TagField
              id="certifications"
              label="Certifications"
              placeholder="e.g. ISO 9001, FSSAI, APEDA, GMP"
              values={form.watch('certifications') ?? []}
              onChange={(v) => form.setValue('certifications', v)}
            />
            <TagField
              id="exportMarkets"
              label="Export Markets"
              placeholder="e.g. USA, Germany, UAE"
              values={form.watch('exportMarkets') ?? []}
              onChange={(v) => form.setValue('exportMarkets', v)}
            />
            <TagField
              id="productCategories"
              label="Product Categories"
              placeholder="e.g. Spices, Textiles, Machinery"
              values={form.watch('productCategories') ?? []}
              onChange={(v) => form.setValue('productCategories', v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Media & Files</CardTitle>
            <CardDescription>Link your profiles and upload your company files.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {['linkedin', 'facebook', 'instagram', 'twitter', 'youtube'].map((platform) => (
              <div key={platform} className="space-y-2">
                <Label htmlFor={`social-${platform}`} className="capitalize">{platform}</Label>
                <Input
                  id={`social-${platform}`}
                  placeholder={`https://${platform}.com/...`}
                  defaultValue={socialLinks[platform] ?? ''}
                  onBlur={(e) => setSocialLink(platform, e.target.value)}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Logo</Label>
              <UploadInput
                label="Logo"
                accept="image/*"
                value={form.watch('logoUrl')}
                onChange={(url) => form.setValue('logoUrl', url)}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Brochure</Label>
              <UploadInput
                label="Brochure"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                value={form.watch('brochureUrl')}
                onChange={(url) => form.setValue('brochureUrl', url)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}