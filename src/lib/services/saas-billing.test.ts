import { describe, expect, it } from 'vitest';
import { computeSaasInvoiceTotals, round2 } from './saas-billing';

describe('computeSaasInvoiceTotals', () => {
  it('computes subtotal, tax and total from items', () => {
    const result = computeSaasInvoiceTotals(
      [
        { description: 'Monthly plan', quantity: 1, unitPrice: 500 },
        { description: 'Additional seats', quantity: 2, unitPrice: 25 }
      ],
      { tax: 55 }
    );
    expect(result.subtotal).toBe(550);
    expect(result.tax).toBe(55);
    expect(result.total).toBe(605);
    expect(result.lines).toEqual([
      { description: 'Monthly plan', quantity: 1, unit_price: 500, amount: 500 },
      { description: 'Additional seats', quantity: 2, unit_price: 25, amount: 50 }
    ]);
  });

  it('defaults quantity to 1 and unit price to 0', () => {
    const result = computeSaasInvoiceTotals([{ description: 'Setup fee' }]);
    expect(result.subtotal).toBe(0);
    expect(result.lines[0]).toEqual({ description: 'Setup fee', quantity: 1, unit_price: 0, amount: 0 });
  });

  it('defaults tax to zero', () => {
    const result = computeSaasInvoiceTotals([{ description: 'Item', quantity: 1, unitPrice: 100 }]);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(100);
  });

  it('handles fractional money without float drift', () => {
    const result = computeSaasInvoiceTotals(
      [{ description: 'Item', quantity: 3, unitPrice: 0.1 }],
      { tax: 0.3 }
    );
    expect(result.subtotal).toBe(0.3);
    expect(result.total).toBe(0.6);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10)).toBe(10);
    expect(round2(1.1)).toBe(1.1);
  });
});
