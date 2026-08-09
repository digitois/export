'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COUNTRIES, CURRENCIES } from '@/lib/constants';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    country?: string | null;
    gstNumber?: string | null;
    paymentTerms?: string | null;
    currency: string;
    notes?: string | null;
  };
}

export default function SupplierForm(props: SupplierFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [name, setName] = useState(init?.name ?? '');
  const [contactPerson, setContactPerson] = useState(init?.contactPerson ?? '');
  const [email, setEmail] = useState(init?.email ?? '');
  const [phone, setPhone] = useState(init?.phone ?? '');
  const [address, setAddress] = useState(init?.address ?? '');
  const [country, setCountry] = useState(init?.country ?? '');
  const [gstNumber, setGstNumber] = useState(init?.gstNumber ?? '');
  const [paymentTerms, setPaymentTerms] = useState(init?.paymentTerms ?? '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      const body = { name, contactPerson: contactPerson || null, email: email || null, phone: phone || null, address: address || null, country: country || null, gstNumber: gstNumber || null, paymentTerms: paymentTerms || null, currency, notes: notes || null };
      await api(id ? `/api/suppliers/${id}` : '/api/suppliers', { method: id ? 'PATCH' : 'POST', body });
      toast.success(id ? 'Supplier updated' : 'Supplier created');
      router.push('/suppliers'); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save supplier'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card><CardHeader><CardTitle className="text-base">Supplier details</CardTitle><CardDescription>Contact and billing information.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" /></div>
        <div className="space-y-2"><Label>Contact person</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>Address</Label><Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="space-y-2"><Label>Country</Label><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>GST Number</Label><Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g. 27ABCDE1234F1Z5" /></div>
        <div className="space-y-2"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" /></div>
        <div className="space-y-2"><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </CardContent></Card>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {mode === 'edit' ? 'Save Changes' : 'Create Supplier'}</Button></div>
    </form>
  );
}