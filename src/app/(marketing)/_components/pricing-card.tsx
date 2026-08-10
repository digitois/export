import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, type Plan } from '../_lib/plans';

interface PricingCardProps {
  plan: Plan;
  highlighted?: boolean;
}

export function PricingCard({ plan, highlighted = false }: PricingCardProps) {
  const features = plan.features.slice(0, 5);
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 sm:p-8',
        highlighted
          ? 'border-[#0B6B63] bg-[#0B6B63] text-white shadow-xl'
          : 'border-[#363D42]/10 bg-white'
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0B6B63] px-3 py-1 text-xs font-semibold text-white shadow">
          Most popular
        </span>
      )}
      <div>
        <h3 className={cn('text-base font-semibold', highlighted ? 'text-white' : 'text-[#363D42]')}>
          {plan.name}
        </h3>
        {plan.description && (
          <p className={cn('mt-1 text-sm', highlighted ? 'text-white/80' : 'text-[#363D42]/60')}>
            {plan.description}
          </p>
        )}
        <div className="mt-6 flex items-baseline gap-1">
          <span className={cn('text-4xl font-bold tracking-tight', highlighted ? 'text-white' : 'text-[#363D42]')}>
            {formatPrice(plan.price_monthly, plan.currency)}
          </span>
          <span className={cn('text-sm', highlighted ? 'text-white/70' : 'text-[#363D42]/50')}>/month</span>
        </div>
      </div>
      <ul className="mt-8 flex-1 space-y-3">
        {features.length === 0 ? (
          <li className={cn('text-sm italic', highlighted ? 'text-white/70' : 'text-[#363D42]/50')}>
            Features are being finalised.
          </li>
        ) : (
          features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check
                className={cn('mt-0.5 h-4 w-4 shrink-0', highlighted ? 'text-white' : 'text-[#0B6B63]')}
              />
              <span className={highlighted ? 'text-white/90' : 'text-[#363D42]/80'}>{feature}</span>
            </li>
          ))
        )}
      </ul>
      <Link
        href="/signup"
        className={cn(
          'mt-8 inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors',
          highlighted
            ? 'bg-white text-[#0B6B63] hover:bg-white/90'
            : 'bg-[#041902] text-white hover:bg-[#0B6B63]'
        )}
      >
        Start free trial
      </Link>
    </div>
  );
}