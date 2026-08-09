import type { SupabaseClient } from '@supabase/supabase-js';
import { round2 } from '@/lib/services/landed-cost';

export interface FinanceSummary {
  currency: string;
  revenue: number;
  cashIn: number;
  cashOut: number;
  profit: number;
  outstanding: number;
  margins: {
    expenseCount: number;
    invoiceCount: number;
    paymentCount: number;
    overdueAmount: number;
  };
  byCategory: Array<{ category: string; amount: number; count: number }>;
  monthly: Array<{ month: string; cashIn: number; cashOut: number; revenue: number }>;
}

interface ExpenseRow {
  category: string;
  amount: number;
  currency: string;
  expense_date: string;
}

interface InvoiceRow {
  id: string;
  total: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_date: string;
  created_at: string;
}

interface PaymentRow {
  amount: number;
  currency: string;
  payment_date: string;
}

const INVOICE_STATUSES: Record<string, { countsAsRevenue: boolean }> = {
  draft: { countsAsRevenue: true },
  sent: { countsAsRevenue: true },
  paid: { countsAsRevenue: true },
  partially_paid: { countsAsRevenue: true },
  overdue: { countsAsRevenue: true },
  cancelled: { countsAsRevenue: false },
  void: { countsAsRevenue: false }
};

const MONTH_KEYS: Record<string, string> = {
  '0': 'Jan', '1': 'Feb', '2': 'Mar', '3': 'Apr', '4': 'May', '5': 'Jun',
  '6': 'Jul', '7': 'Aug', '8': 'Sep', '9': 'Oct', '10': 'Nov', '11': 'Dec'
};

function monthKey(d: string): string {
  const date = new Date(d);
  return `${MONTH_KEYS[String(date.getMonth())]} ${date.getFullYear()}`;
}

export interface FinanceAggregateInput {
  invoices: InvoiceRow[];
  expenses: ExpenseRow[];
  payments: PaymentRow[];
  months?: number;
  now?: Date;
}

/**
 * Pure aggregation over invoice/payment/expense rows — kept separate from the
 * Supabase fetch so the math can be unit tested.
 */
export function computeFinanceAggregates(
  input: FinanceAggregateInput
): Omit<FinanceSummary, 'margins'> & { overdueAmount: number } {
  const { invoices, expenses, payments, months = 6, now = new Date() } = input;

  const currencyCounts = new Map<string, number>();
  invoices.forEach((i) => currencyCounts.set(i.currency, (currencyCounts.get(i.currency) ?? 0) + 1));
  expenses.forEach((e) => currencyCounts.set(e.currency, (currencyCounts.get(e.currency) ?? 0) + 1));
  const currency = currencyCounts.size
    ? [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : 'USD';

  let revenue = 0;
  let outstanding = 0;
  let overdueAmount = 0;
  invoices.forEach((inv) => {
    if (INVOICE_STATUSES[inv.status]?.countsAsRevenue ?? true) {
      revenue += inv.total;
    }
    const remaining = inv.total - (inv.amount_paid ?? 0);
    if (remaining > 0 && inv.status !== 'cancelled' && inv.status !== 'void') {
      outstanding += remaining;
      if (inv.status === 'overdue') overdueAmount += remaining;
    }
  });

  const cashIn = payments.reduce((sum, p) => sum + p.amount, 0);
  const cashOut = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = revenue - cashOut;

  const byCategoryMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach((e) => {
    const entry = byCategoryMap.get(e.category) ?? { amount: 0, count: 0 };
    entry.amount += e.amount;
    entry.count += 1;
    byCategoryMap.set(e.category, entry);
  });
  const byCategory = [...byCategoryMap.entries()]
    .map(([category, v]) => ({ category, amount: round2(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount);

  const monthlyMap = new Map<string, { cashIn: number; cashOut: number; revenue: number }>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(monthKey(d.toISOString()), { cashIn: 0, cashOut: 0, revenue: 0 });
  }
  payments.forEach((p) => {
    const key = monthKey(p.payment_date);
    const entry = monthlyMap.get(key);
    if (entry) entry.cashIn += p.amount;
  });
  expenses.forEach((e) => {
    const key = monthKey(e.expense_date);
    const entry = monthlyMap.get(key);
    if (entry) entry.cashOut += e.amount;
  });
  invoices.forEach((inv) => {
    const key = monthKey(inv.created_at);
    const entry = monthlyMap.get(key);
    if (entry && (INVOICE_STATUSES[inv.status]?.countsAsRevenue ?? true)) entry.revenue += inv.total;
  });
  const monthly = [...monthlyMap.entries()].map(([month, v]) => ({
    month,
    cashIn: round2(v.cashIn),
    cashOut: round2(v.cashOut),
    revenue: round2(v.revenue)
  }));

  return {
    currency,
    revenue: round2(revenue),
    cashIn: round2(cashIn),
    cashOut: round2(cashOut),
    profit: round2(profit),
    outstanding: round2(outstanding),
    overdueAmount: round2(overdueAmount),
    byCategory,
    monthly
  };
}

/**
 * Light P&L read model: revenue from invoices, cash in from invoice payments,
 * cash out from expenses, aggregated by the organization's dominant currency.
 */
export async function getFinanceSummary(
  supabase: SupabaseClient,
  organizationId: string,
  months = 6
): Promise<FinanceSummary> {
  const [invoicesRes, expensesRes, paymentsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id,total,amount_paid,currency,status,invoice_date,created_at')
      .eq('organization_id', organizationId),
    supabase
      .from('expenses')
      .select('category,amount,currency,expense_date')
      .eq('organization_id', organizationId),
    supabase
      .from('invoice_payments')
      .select('amount,currency,payment_date')
      .eq('organization_id', organizationId)
  ]);

  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];
  const expenses = (expensesRes.data ?? []) as unknown as ExpenseRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];

  const aggregates = computeFinanceAggregates({ invoices, expenses, payments, months });

  return {
    ...aggregates,
    margins: {
      expenseCount: expenses.length,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      overdueAmount: aggregates.overdueAmount
    }
  };
}
