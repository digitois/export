'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { createOrganizationSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/loading';

type OrgValues = z.infer<typeof createOrganizationSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<OrgValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', slug: '' }
  });

  const watchName = form.watch('name');
  const currentSlug = form.watch('slug');

  function generateSlug() {
    if (!currentSlug && watchName) {
      form.setValue(
        'slug',
        watchName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
      );
    }
  }

  async function onSubmit(values: OrgValues) {
    setLoading(true);
    try {
      const { data } = await api<{ data: { id: string } }>('/api/auth/organizations', {
        method: 'POST',
        body: values
      });
      toast.success('Organization created!');
      window.location.assign('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create organization');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create your organization</CardTitle>
            <CardDescription>Set up your workspace to start building your export business.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization name</Label>
                <Input
                  id="name"
                  placeholder="Sharma Exports"
                  {...form.register('name')}
                  onBlur={generateSlug}
                />
                {form.formState.errors.name && (
                  <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Website slug</Label>
                <div className="flex items-center gap-1">
                  <Input id="slug" placeholder="sharma-exports" {...form.register('slug')} />
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    .{process.env.NEXT_PUBLIC_SITE_BASE_HOST ?? 'exportos.com'}
                  </span>
                </div>
                {form.formState.errors.slug && (
                  <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner />}
                Create organization
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
