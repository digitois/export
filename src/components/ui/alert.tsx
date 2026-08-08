'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground', {
  variants: {
    variant: {
      default: 'bg-background text-foreground',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      info: 'border-sky-500/50 text-sky-700 dark:text-sky-300 [&>svg]:text-sky-500',
      success: 'border-green-500/50 text-green-700 dark:text-green-300 [&>svg]:text-green-500',
      warning: 'border-amber-500/50 text-amber-700 dark:text-amber-300 [&>svg]:text-amber-500'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertIcon = ({ variant }: { variant?: VariantProps<typeof alertVariants>['variant'] }) => {
  const Icon = variant === 'destructive' ? XCircle : variant === 'info' ? Info : variant === 'success' ? CheckCircle2 : variant === 'warning' ? AlertTriangle : Info;
  return <Icon className="h-4 w-4" />;
};

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight pl-7', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed pl-7', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, AlertIcon };
