'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface CompanyProfile {
  companyName?: string | null;
  tagline?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  businessType?: string | null;
  yearEstablished?: number | null;
  employeeCount?: string | null;
  iecNumber?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  factoryAddress?: string | null;
  exportMarkets?: string[] | null;
  productCategories?: string[] | null;
  certifications?: string[] | null;
  brochureUrl?: string | null;
}

const emptyForm: ProfileForm = {
  companyName: '',
  tagline: '',
  about: '',
  logoUrl: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  businessType: '',
  yearEstablished: '',
  employeeCount: '',
  iecNumber: '',
  gstNumber: '',
  panNumber: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  contactPerson: '',
  addressLine1: '',
  addressLine2: '',
  factoryAddress: '',
  exportMarkets: '',
  productCategories: '',
  certifications: '',
  brochureUrl: ''
};

type ProfileForm = {
  companyName: string;
  tagline: string;
  about: string;
  logoUrl: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  businessType: string;
  yearEstablished: string;
  employeeCount: string;
  iecNumber: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  contactPerson: string;
  addressLine1: string;
  addressLine2: string;
  factoryAddress: string;
  exportMarkets: string;
  productCategories: string;
  certifications: string;
  brochureUrl: string;
};

function fromProfile(profile: CompanyProfile | null): ProfileForm {
  if (!profile) return emptyForm;
  return {
    companyName: profile.companyName ?? '',
    tagline: profile.tagline ?? '',
    about: profile.about ?? '',
    logoUrl: profile.logoUrl ?? '',
    country: profile.country ?? '',
    state: profile.state ?? '',
    city: profile.city ?? '',
    pincode: profile.pincode ?? '',
    businessType: profile.businessType ?? '',
    yearEstablished: profile.yearEstablished != null ? String(profile.yearEstablished) : '',
    employeeCount: profile.employeeCount ?? '',
    iecNumber: profile.iecNumber ?? '',
    gstNumber: profile.gstNumber ?? '',
    panNumber: profile.panNumber ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    website: profile.website ?? '',
    contactPerson: profile.contactPerson ?? '',
    addressLine1: profile.addressLine1 ?? '',
    addressLine2: profile.addressLine2 ?? '',
    factoryAddress: profile.factoryAddress ?? '',
    exportMarkets: (profile.exportMarkets ?? []).join(', '),
    productCategories: (profile.productCategories ?? []).join(', '),
    certifications: (profile.certifications ?? []).join(', '),
    brochureUrl: profile.brochureUrl ?? ''
  };
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api<{ data: CompanyProfile | null }>('/api/company')
      .then((res) => setForm(fromProfile(res.data)))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load company profile');
        setForm(emptyForm);
      })
      .finally(() => setLoading(false));
  }, []);

  function setFn<K extends keyof ProfileForm>(key: K) {
    return (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const payload: Record<string, unknown> = {
      companyName: form.companyName.trim() || null,
      tagline: form.tagline.trim() || null,
      about: form.about.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      country: form.country.trim() || null,
      state: form.state.trim() || null,
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      businessType: form.businessType.trim() || null,
      yearEstablished: form.yearEstablished.trim() ? Number(form.yearEstablished) : null,
      employeeCount: form.employeeCount.trim() || null,
      iecNumber: form.iecNumber.trim() || null,
      gstNumber: form.gstNumber.trim() || null,
      panNumber: form.panNumber.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      website: form.website.trim() || null,
      contactPerson: form.contactPerson.trim() || null,
      addressLine1: form.addressLine1.trim() || null,
      addressLine2: form.addressLine2.trim() || null,
      factoryAddress: form.factoryAddress.trim() || null,
      exportMarkets: form.exportMarkets.trim() ? splitList(form.exportMarkets) : [],
      productCategories: form.productCategories.trim() ? splitList(form.productCategories) : [],
      certifications: form.certifications.trim() ? splitList(form.certifications) : [],
      brochureUrl: form.brochureUrl.trim() || null
    };
    try {
      await api('/api/company', { method: 'PUT', body: payload });
      setStatus({ type: 'success', message: 'Changed saved' });
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save company profile' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your company profile">
        <Button type="submit" form="company-profile-form" disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </PageHeader>

      {loading ? (
        <Loading label="Loading company profile..." />
      ) : (
        <form id="company-profile-form" onSubmit={handleSave}>
          <Card>
            <CardContent className="space-y-8 pt-6">
              <Section title="Profile" description="Basic information about your company.">
                <Field label="Company Name *" value={form.companyName} onChange={setFn('companyName')} placeholder="Acme Exports" />
                <Field label="Tagline" value={form.tagline} onChange={setFn('tagline')} placeholder="Premium Indian spices for the world" />
                <Field label="About" value={form.about} onChange={setFn('about')} type="textarea" rows={4} placeholder="Tell buyers about your company..." />
                <Field label="Logo URL" value={form.logoUrl} onChange={setFn('logoUrl')} placeholder="https://..." />
                <Field label="Country" value={form.country} onChange={setFn('country')} placeholder="India" />
                <Field label="State" value={form.state} onChange={setFn('state')} placeholder="Gujarat" />
                <Field label="City" value={form.city} onChange={setFn('city')} placeholder="Ahmedabad" />
                <Field label="Pincode" value={form.pincode} onChange={setFn('pincode')} placeholder="380001" />
              </Section>

              <Section title="Business & Registrations" description="Regulatory and registration details.">
                <Field label="Business Type" value={form.businessType} onChange={setFn('businessType')} placeholder="Private Limited" />
                <Field label="Year Established" type="number" value={form.yearEstablished} onChange={setFn('yearEstablished')} placeholder="2015" />
                <Field label="Employee Count" value={form.employeeCount} onChange={setFn('employeeCount')} placeholder="150" />
                <Field label="IEC Number" value={form.iecNumber} onChange={setFn('iecNumber')} placeholder="IEC1234567890" />
                <Field label="GST Number" value={form.gstNumber} onChange={setFn('gstNumber')} placeholder="24AAACA0000A1Z5" />
                <Field label="PAN Number" value={form.panNumber} onChange={setFn('panNumber')} placeholder="AAACA0000A" />
              </Section>

              <Section title="Contact" description="How buyers can reach you.">
                <Field label="Email" type="email" value={form.email} onChange={setFn('email')} placeholder="sales@example.com" />
                <Field label="Phone" value={form.phone} onChange={setFn('phone')} placeholder="+91 98765 43210" />
                <Field label="WhatsApp" value={form.whatsapp} onChange={setFn('whatsapp')} placeholder="+91 98765 43210" />
                <Field label="Website" value={form.website} onChange={setFn('website')} placeholder="https://example.com" />
                <Field label="Contact Person" value={form.contactPerson} onChange={setFn('contactPerson')} placeholder="Rahul Sharma" />
                <Field label="Address Line 1" value={form.addressLine1} onChange={setFn('addressLine1')} placeholder="12/A GIDC Industrial Estate" />
                <Field label="Address Line 2" value={form.addressLine2} onChange={setFn('addressLine2')} placeholder="Phase 2, Vatva" />
                <Field label="Factory Address" value={form.factoryAddress} onChange={setFn('factoryAddress')} placeholder="Plot 45, Spice Park, Jodhpur" />
              </Section>

              <Section title="Export" description="What you export and where.">
                <Field label="Export Markets" value={form.exportMarkets} onChange={setFn('exportMarkets')} placeholder="USA, UAE, United Kingdom" />
                <Field label="Product Categories" value={form.productCategories} onChange={setFn('productCategories')} placeholder="Spices, Rice, Handicrafts" />
                <Field label="Certifications" value={form.certifications} onChange={setFn('certifications')} placeholder="ISO 9001, FSSAI, Organic" />
                <Field label="Brochure URL" value={form.brochureUrl} onChange={setFn('brochureUrl')} placeholder="https://..." />
              </Section>

              {status && (
                <p className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'}>
                  {status.message}
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {type === 'textarea' ? (
        <Textarea rows={rows ?? 3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}