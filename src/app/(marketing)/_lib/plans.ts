import { createSiteClient } from '@/lib/supabase/site';

export interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number | null;
  price_annual: number | null;
  currency: string | null;
  features: string[];
  is_active: boolean;
}

export function formatPrice(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return 'Contact us';
  if (amount === 0) return 'Free';
  const code = currency && currency.length === 3 ? currency : 'INR';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0
  }).format(amount);
}

export async function fetchPlans(): Promise<Plan[]> {
  try {
    const supabase = createSiteClient();
    const { data } = await supabase.from('plans').select('*').order('sort_order', { ascending: true });
    return (data ?? []) as Plan[];
  } catch {
    return [];
  }
}