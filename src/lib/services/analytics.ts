import type { SupabaseClient } from '@supabase/supabase-js';

const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

export interface DashboardStats {
  leadsTotal: number;
  leadsNew: number;
  leadsWon: number;
  leadsThisMonth: number;
  quotationTotal: number;
  quotationAccepted: number;
  quotationValue: number;
  invoiceTotal: number;
  invoicePaid: number;
  revenue: number;
  pendingRevenue: number;
  productsPublished: number;
  buyersTotal: number;
  visitorsThisMonth: number;
  conversionRate: number;
  topCountries: Array<{ country: string; count: number }>;
  topProducts: Array<{ product: string; count: number }>;
}

export async function getDashboardStats(supabase: SupabaseClient, organizationId: string): Promise<DashboardStats> {
  const [leads, leadsNew, leadsWon, leadsThisMonth, quotes, accepted, quotesTotal, inv, invPaid, revenue, pendingRevenue, products, buyers, visitors, topC, topP] =
    await Promise.all([
      count(supabase, 'leads', organizationId),
      countWhere(supabase, 'leads', organizationId, 'status', 'new'),
      countWhere(supabase, 'leads', organizationId, 'status', 'won'),
      countWhere(supabase, 'leads', organizationId, 'created_at_gte', monthAgo),
      count(supabase, 'quotations', organizationId),
      countWhere(supabase, 'quotations', organizationId, 'status', 'accepted'),
      sumWhere(supabase, 'quotations', organizationId, 'total'),
      count(supabase, 'invoices', organizationId),
      countWhere(supabase, 'invoices', organizationId, 'status', 'paid'),
      sumWhere(supabase, 'invoices', organizationId, 'total', 'status_in_revenue', 'paid,partially_paid'),
      sumWhere(supabase, 'invoices', organizationId, 'total', 'status', 'sent'),
      countWhere(supabase, 'products', organizationId, 'status', 'published'),
      count(supabase, 'buyers', organizationId),
      countWhere(supabase, 'website_visits', organizationId, 'created_at_gte', monthAgo),
      groupTop(supabase, 'leads', organizationId, 'country', 5),
      groupTop(supabase, 'leads', organizationId, 'product_interested', 5)
    ]);

  return {
    leadsTotal: leads,
    leadsNew,
    leadsWon,
    leadsThisMonth,
    quotationTotal: quotes,
    quotationAccepted: accepted,
    quotationValue: quotesTotal,
    invoiceTotal: inv,
    invoicePaid: invPaid,
    revenue,
    pendingRevenue,
    productsPublished: products,
    buyersTotal: buyers,
    visitorsThisMonth: visitors,
    conversionRate: leads > 0 ? Math.min(100, Math.round((leadsWon / leads) * 1000) / 10) : 0,
    topCountries: topC.map(({ key, count }) => ({ country: key, count })),
    topProducts: topP.map(({ key, count }) => ({ product: key, count }))
  };
}

async function count(supabase: SupabaseClient, table: string, org: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org);
  return count ?? 0;
}

async function countWhere(supabase: SupabaseClient, table: string, org: string, field: string, value: string): Promise<number> {
  let q = supabase.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', org);
  if (field === 'created_at_gte') q = q.gte('created_at', value);
  else if (field === 'status_in_paid') q = q.eq('status', value);
  else q = q.eq(field, value);
  const { count } = await q;
  return count ?? 0;
}

async function sumWhere(
  supabase: SupabaseClient,
  table: string,
  org: string,
  column: string,
  field?: string,
  value?: string
): Promise<number> {
  let q = supabase.from(table).select(column).eq('organization_id', org);
  if (field === 'status_in_revenue') q = q.in('status', (value ?? '').split(','));
  else if (field) q = q.eq(field, value);
  const { data } = await q;
  if (!data) return 0;
  return (data as unknown as Array<Record<string, number>>).reduce((sum, row) => sum + Number(row[column] ?? 0), 0);
}

async function groupTop(
  supabase: SupabaseClient,
  table: string,
  org: string,
  column: string,
  limit: number
): Promise<Array<{ key: string; count: number }>> {
  const { data } = await supabase
    .from(table)
    .select(column)
    .eq('organization_id', org)
    .not(column, 'is', null)
    .limit(1000);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const key = String(row[column] ?? '');
    if (!key || key === 'null') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

async function invTotal(supabase: SupabaseClient) {
  void supabase;
  return 0;
}

export async function getLeadFunnel(supabase: SupabaseClient, organizationId: string) {
  const stages = ['new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won'];
  const results: Array<{ stage: string; count: number }> = [];
  for (const stage of stages) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', stage);
    results.push({ stage, count: count ?? 0 });
  }
  return results;
}

export async function getMonthlyTrend(
  supabase: SupabaseClient,
  organizationId: string,
  table: 'leads' | 'quotations' | 'invoices',
  months = 6
) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);

  const { data } = await supabase
    .from(table)
    .select('created_at, total')
    .eq('organization_id', organizationId)
    .gte('created_at', since.toISOString());

  const map = new Map<string, number>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    map.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
  }

  for (const row of (data ?? []) as Array<{ created_at: string; total?: number }>) {
    const key = row.created_at.slice(0, 7);
    if (map.has(key)) {
      const value = table === 'invoices' ? Number(row.total ?? 0) : 1;
      map.set(key, (map.get(key) ?? 0) + value);
    }
  }

  return Array.from(map.entries()).map(([month, value]) => ({ month, value }));
}

export async function getWebsiteVisitors(supabase: SupabaseClient, organizationId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from('website_visits')
    .select('visited_at, device, country')
    .eq('organization_id', organizationId)
    .gte('visited_at', since);

  const byDay = new Map<string, number>();
  const devices: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of (data ?? []) as Array<{ visited_at: string; device?: string }>) {
    const day = row.visited_at.slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    if (row.device) devices[row.device] = (devices[row.device] ?? 0) + 1;
  }

  return {
    byDay: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
    devices
  };
}
