import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  delta?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
  sparkline?: number[];
  className?: string;
}

export function KpiCard({ title, value, icon: Icon, description, delta, sparkline, className }: KpiCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getDeltaIcon = () => {
    switch (delta?.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      case 'neutral':
        return <Minus className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getDeltaColor = () => {
    switch (delta?.trend) {
      case 'up':
        return 'text-pos';
      case 'down':
        return 'text-neg';
      case 'neutral':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    
    const points = sparkline.map((val, i) => {
      const x = (i / (sparkline.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg
        className="h-8 w-full text-primary"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <Card className={cn('card-shadow overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatValue(value)}
              </p>
              {delta && (
                <div className={cn('flex items-center gap-1 text-xs font-medium', getDeltaColor())}>
                  {getDeltaIcon()}
                  <span className="tabular-nums">
                    {Math.abs(delta.value)}%
                  </span>
                  {delta.label && <span className="text-muted-foreground">{delta.label}</span>}
                </div>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-weak">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        {sparkline && (
          <div className="mt-4">
            {renderSparkline()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}