import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, X, Info } from 'lucide-react';

const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-pos/12 text-pos border border-pos/20',
        warning: 'bg-warn/12 text-warn border border-warn/20',
        error: 'bg-neg/12 text-neg border border-neg/20',
        info: 'bg-info/12 text-info border border-info/20',
        neutral: 'bg-muted text-muted-foreground border border-line'
      }
    },
    defaultVariants: {
      variant: 'neutral'
    }
  }
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusPillVariants> {
  icon?: boolean;
}

const statusIcons = {
  success: Check,
  warning: AlertTriangle,
  error: X,
  info: Info,
  neutral: Info
};

function StatusPill({ className, variant, icon = true, children, ...props }: StatusPillProps) {
  const Icon = statusIcons[variant || 'neutral'];
  
  return (
    <div className={cn(statusPillVariants({ variant }), className)} {...props}>
      {icon && <Icon className="h-3 w-3" />}
      <span>{children}</span>
    </div>
  );
}

export { StatusPill, statusPillVariants };