import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  trend?: number;
}

export function StatCard({ title, value, icon: Icon, description, className, trend }: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;
  return (
    <Card className={cn('group', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          {Icon && (
            <div className="rounded-lg bg-accent-weak p-2 text-primary transition-colors group-hover:bg-accent-weak/70">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
          {hasTrend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                trend > 0 ? 'text-pos' : 'text-neg'
              )}
            >
              {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
