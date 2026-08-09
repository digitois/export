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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    department?: string | null;
    joiningDate?: string | null;
    status: string;
    baseSalary: number;
    currency: string;
    bankName?: string | null;
    bankAccount?: string | null;
    bankIfsc?: string | null;
    address?: string | null;
    notes?: string | null;
  };
}

export default function EmployeeForm(props: EmployeeFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [fullName, setFullName] = useState(init?.fullName ?? '');
  const [email, setEmail] = useState(init?.email ?? '');
  const [phone, setPhone] = useState(init?.phone ?? '');
  const [designation, setDesignation] = useState(init?.designation ?? '');
  const [department, setDepartment] = useState(init?.department ?? '');
  const [joiningDate, setJoiningDate] = useState(init?.joiningDate ?? '');
  const [status, setStatus] = useState(init?.status ?? 'active');
  const [baseSalary, setBaseSalary] = useState(init ? String(init.baseSalary) : '');
  const [currency, setCurrency] = useState(init?.currency ?? 'USD');
  const [bankName, setBankName] = useState(init?.bankName ?? '');
  const [bankAccount, setBankAccount] = useState(init?.bankAccount ?? '');
  const [bankIfsc, setBankIfsc] = useState(init?.bankIfsc ?? '');
  const [address, setAddress] = useState(init?.address ?? '');
  const [notes, setNotes] = useState(init?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        fullName,
        email: email || null,
        phone: phone || null,
        designation: designation || null,
        department: department || null,
        joiningDate: joiningDate || null,
        status,
        baseSalary: baseSalary ? Number(baseSalary) : 0,
        currency,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankIfsc: bankIfsc || null,
        address: address || null,
        notes: notes || null
      };
      await api(id ? `/api/hrm/employees/${id}` : '/api/hrm/employees', {
        method: id ? 'PATCH' : 'POST',
        body
      });
      toast.success(id ? 'Employee updated' : 'Employee created');
      router.push('/hrm');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Basic information about the employee.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Sales Executive" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales" />
            </div>
            <div className="space-y-2">
              <Label>Joining date</Label>
              <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compensation</CardTitle>
          <CardDescription>Salary and bank details used for payroll.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Base salary</Label>
              <Input type="number" min="0" step="0.01" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HSBC" />
            </div>
            <div className="space-y-2">
              <Label>Bank account</Label>
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account number" />
            </div>
            <div className="space-y-2">
              <Label>IFSC / Sort code</Label>
              <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="e.g. HDFC0001234" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Residential address" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
