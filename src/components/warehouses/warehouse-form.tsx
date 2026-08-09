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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WarehouseFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    name: string;
    location?: string | null;
    isDefault: boolean;
  };
}

export default function WarehouseForm(props: WarehouseFormProps) {
  const router = useRouter();
  const { mode, id, initial: init } = props;

  const [name, setName] = useState(init?.name ?? '');
  const [location, setLocation] = useState(init?.location ?? '');
  const [isDefault, setIsDefault] = useState(init?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }
    setSaving(true);
    try {
      const body = { name, location: location || null, isDefault };
      await api(id ? `/api/warehouses/${id}` : '/api/warehouses', {
        method: id ? 'PATCH' : 'POST',
        body
      });
      toast.success(id ? 'Warehouse updated' : 'Warehouse created');
      router.push('/warehouses');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warehouse details</CardTitle>
          <CardDescription>Name, location and default setting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Warehouse" />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Textarea rows={2} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address, city, country" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} id="isDefault" />
            <Label htmlFor="isDefault" className="text-sm font-medium">Set as default warehouse</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Warehouse'}
        </Button>
      </div>
    </form>
  );
}