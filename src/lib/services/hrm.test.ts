import { describe, expect, it } from 'vitest';
import { calculateLeaveDays, computePayrollLine, round2 } from './hrm';

describe('calculateLeaveDays', () => {
  it('counts inclusive days for a single-day leave', () => {
    expect(calculateLeaveDays('2026-06-10', '2026-06-10')).toBe(1);
  });

  it('counts inclusive days across a multi-day leave', () => {
    expect(calculateLeaveDays('2026-06-10', '2026-06-14')).toBe(5);
  });

  it('returns at least 1 day for inverted ranges', () => {
    expect(calculateLeaveDays('2026-06-14', '2026-06-10')).toBe(1);
  });

  it('counts days across month boundaries', () => {
    expect(calculateLeaveDays('2026-06-28', '2026-07-02')).toBe(5);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10)).toBe(10);
    expect(round2(10.1)).toBe(10.1);
  });
});

describe('computePayrollLine', () => {
  it('net = gross + allowances - deductions', () => {
    expect(computePayrollLine({ baseSalary: 2000 }, { allowances: 300, deductions: 100 })).toEqual({
      gross: 2000,
      allowances: 300,
      deductions: 100,
      net: 2200
    });
  });

  it('defaults allowances and deductions to zero', () => {
    expect(computePayrollLine({ baseSalary: 1500.5 })).toEqual({
      gross: 1500.5,
      allowances: 0,
      deductions: 0,
      net: 1500.5
    });
  });

  it('handles fractional inputs without float drift', () => {
    const result = computePayrollLine({ baseSalary: 0.1 }, { allowances: 0.2, deductions: 0.3 });
    expect(result.net).toBe(0);
  });
});
