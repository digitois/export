import { describe, expect, it } from 'vitest';
import { computeLandedCost, compareIncoterms, round2 } from './landed-cost';

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.234)).toBe(1.23);
    expect(round2(2)).toBe(2);
  });
});

describe('computeLandedCost', () => {
  const base = {
    productValue: 1000,
    freight: 200,
    insurance: 50,
    dutyRate: 10,
    otherCharges: 30,
    quantity: 100
  };

  it('EXW: importer pays freight, insurance, duty and other charges', () => {
    const r = computeLandedCost({ ...base, incoterm: 'EXW' });
    // duty base = CIF = 1000 + 200 + 50 = 1250 -> duty 125
    expect(r.freight).toBe(200);
    expect(r.insurance).toBe(50);
    expect(r.duty).toBe(125);
    expect(r.otherCharges).toBe(30);
    expect(r.landedCost).toBe(1405);
    expect(r.unitCost).toBe(14.05);
  });

  it('FOB: same buyer-borne extras as EXW', () => {
    const r = computeLandedCost({ ...base, incoterm: 'FOB' });
    expect(r.landedCost).toBe(1405);
  });

  it('CFR: seller covers freight, importer pays insurance + duty + other', () => {
    const r = computeLandedCost({ ...base, incoterm: 'CFR' });
    expect(r.freight).toBe(0);
    expect(r.insurance).toBe(50);
    expect(r.duty).toBe(125);
    expect(r.otherCharges).toBe(30);
    expect(r.landedCost).toBe(1205);
  });

  it('CIF: seller covers freight + insurance, importer pays duty + other', () => {
    const r = computeLandedCost({ ...base, incoterm: 'CIF' });
    expect(r.freight).toBe(0);
    expect(r.insurance).toBe(0);
    expect(r.duty).toBe(125);
    expect(r.otherCharges).toBe(30);
    expect(r.landedCost).toBe(1155);
  });

  it('DDP: seller covers freight + insurance + duty', () => {
    const r = computeLandedCost({ ...base, incoterm: 'DDP' });
    expect(r.freight).toBe(0);
    expect(r.insurance).toBe(0);
    expect(r.duty).toBe(125);
    expect(r.otherCharges).toBe(0);
    expect(r.landedCost).toBe(1125);
  });

  it('zero duty rate produces no duty', () => {
    const r = computeLandedCost({ ...base, dutyRate: 0, incoterm: 'FOB' });
    expect(r.duty).toBe(0);
    expect(r.landedCost).toBe(1280);
  });

  it('zero quantity yields zero unit cost, not a division error', () => {
    const r = computeLandedCost({ ...base, quantity: 0, incoterm: 'FOB' });
    expect(r.unitCost).toBe(0);
    expect(r.landedCost).toBe(1405);
  });

  it('handles fractional values', () => {
    const r = computeLandedCost({ ...base, dutyRate: 12.5, freight: 123.45, incoterm: 'FOB' });
    // CIF = 1000 + 123.45 + 50 = 1173.45 -> duty 146.68
    expect(r.duty).toBe(146.68);
    expect(r.landedCost).toBe(1350.13);
  });
});

describe('compareIncoterms', () => {
  it('returns results for all 11 incoterms', () => {
    const results = compareIncoterms({ productValue: 1000, freight: 200, insurance: 50, dutyRate: 10, otherCharges: 30, quantity: 100 });
    expect(results).toHaveLength(11);
  });

  it('landed cost is highest for EXW and lowest for DDP', () => {
    const results = compareIncoterms({ productValue: 1000, freight: 200, insurance: 50, dutyRate: 10, otherCharges: 30, quantity: 100 });
    const exw = results.find((r) => r.incoterm === 'EXW')!;
    const ddp = results.find((r) => r.incoterm === 'DDP')!;
    expect(exw.landedCost).toBeGreaterThan(ddp.landedCost);
  });
});
