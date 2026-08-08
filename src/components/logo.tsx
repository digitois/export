import { Ship } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Ship className="h-4 w-4" />
      </div>
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Export<span className="text-primary/70">OS</span>
        </span>
      )}
    </div>
  );
}
