'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_percent?: number;
  description?: string | null;
  updated_at: string;
}

export default function AdminFeatureFlagsPage() {
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ data: FeatureFlag[] }>('/api/admin/feature-flags');
      setItems(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(flag: FeatureFlag) {
    setToggling(flag.key);
    try {
      await api('/api/admin/feature-flags', {
        method: 'POST',
        body: { key: flag.key, enabled: !flag.enabled, description: flag.description }
      });
      toast.success(`${flag.key} ${!flag.enabled ? 'enabled' : 'disabled'}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Feature Flags" description="Globally toggle platform features without redeploying." />

      {loading ? (
        <Loading label="Loading feature flags..." />
      ) : items.length === 0 ? (
        <EmptyState title="No feature flags" description="Feature flags will appear here when created." icon={Flag} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((flag) => (
                  <TableRow key={flag.key}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">{flag.key}</code>
                      <Badge variant={flag.enabled ? 'success' : 'outline'} className="ml-2">
                        {flag.enabled ? 'ON' : 'OFF'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{flag.description ?? '-'}</TableCell>
                    <TableCell>{flag.rollout_percent ?? 100}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(flag.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Switch checked={flag.enabled} disabled={toggling === flag.key} onCheckedChange={() => toggle(flag)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}