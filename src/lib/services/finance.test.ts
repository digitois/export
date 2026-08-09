import { describe, expect, it } from 'vitest';
import { computeFinanceAggregates } from './finance';

const invoice = (over: Partial<{ id: string; total: number; amount_paid: number; currency: string; status: string; created_at: string; invoice_date: string }> = {}) => ({
  id: 'inv-1',
  total: 1000,
  amount_paid: 0,
  currency: 'USD',
  status: 'sent',
  created_at: '2026-06-10T00:00:00Z',
  invoice_date: '2026-06-10',
  ...over
});

const payment = (over: Partial<{ amount: number; currency: string; payment_date: string }> = {}) => ({
  amount: 500,
  currency: 'USD',
  payment_date: '2026-06-15',
  ...over
});

const expense = (over: Partial<{ category: string; amount: number; currency: string; expense_date: string }> = {}) => ({
  category: 'freight',
  amount: 200,
  currency: 'USD',
  expense_date: '2026-06-20',
  ...over
});

describe('computeFinanceAggregates', () => {
  it('computes revenue, cash in/out and profit', () => {
    const result = computeFinanceAggregates({
      invoices: [invoice(), invoice({ total: 500, status: 'paid' }), invoice({ status: 'cancelled' })],
      expenses: [expense(), expense({ amount: 50 })],
      payments: [payment(), payment({ amount: 300 })],
      now: new Date(2026, 5, 30)
    });
    expect(result.revenue).toBe(1500);
    expect(result.cashIn).toBe(800);
    expect(result.cashOut).toBe(250);
    expect(result.profit).toBe(1250);
  });

  it('excludes cancelled/void invoices from revenue but keeps them out of outstanding', () => {
    const result = computeFinanceAggregates({
      invoices: [invoice(), invoice({ status: 'cancelled', total: 999 }), invoice({ status: 'void', total: 999 })],
      expenses: [],
      payments: [],
      now: new Date(2026, 5, 30)
    });
    expect(result.revenue).toBe(1000);
    expect(result.outstanding).toBe(1000);
  });

  it('aggregates outstanding including overdue flag', () => {
    const result = computeFinanceAggregates({
      invoices: [
        invoice({ total: 1000, amount_paid: 400 }),
        invoice({ id: 'inv-2', total: 300, status: 'overdue' })
      ],
      expenses: [],
      payments: [],
      now: new Date(2026, 5, 30)
    });
    expect(result.outstanding).toBe(900);
    expect(result.overdueAmount).toBe(300);
  });

  it('picks the dominant currency across invoices and expenses', () => {
    const result = computeFinanceAggregates({
      invoices: [invoice(), invoice({ currency: 'USD' }), invoice({ currency: 'INR' })],
      expenses: [expense()],
      payments: [],
      now: new Date(2026, 5, 30)
    });
    expect(result.currency).toBe('USD');
  });

  it('defaults to USD when there is no data', () => {
    const result = computeFinanceAggregates({ invoices: [], expenses: [], payments: [], now: new Date(2026, 5, 30) });
    expect(result.currency).toBe('USD');
    expect(result.revenue).toBe(0);
    expect(result.monthly).toHaveLength(6);
  });

  it('buckets payments, expenses and invoices into the last N months', () => {
    const result = computeFinanceAggregates({
      invoices: [invoice({ total: 1000, created_at: '2026-06-01T00:00:00Z' })],
      expenses: [expense({ amount: 200, expense_date: '2026-06-20' })],
      payments: [payment({ amount: 300, payment_date: '2026-06-15' })],
      months: 3,
      now: new Date(2026, 5, 30)
    });
    expect(result.monthly).toHaveLength(3);
    const june = result.monthly[2];
    expect(june.cashIn).toBe(300);
    expect(june.cashOut).toBe(200);
    expect(june.revenue).toBe(1000);
  });

  it('groups expenses by category sorted by amount descending', () => {
    const result = computeFinanceAggregates({
      invoices: [],
      expenses: [expense({ amount: 100 }), expense({ category: 'customs', amount: 300 }), expense({ category: 'customs', amount: 50 })],
      payments: [],
      now: new Date(2026, 5, 30)
    });
    expect(result.byCategory[0]).toEqual({ category: 'customs', amount: 350, count: 2 });
    expect(result.byCategory[1]).toEqual({ category: 'freight', amount: 100, count: 1 });
  });
});
