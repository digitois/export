/**
 * Incoterm-aware landed-cost calculation.
 *
 * Pure math — no I/O — kept in its own module so it can be unit tested.
 * Landed cost is derived from how far the seller's price covers delivery:
 * the further the incoterm extends the seller's scope (CIF, DAP, DDP), the
 * fewer add-on components the importer still pays on top of the agreed price.
 */

export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';

export interface LandedCostInput {
  /** Agreed goods value at origin (EXW / FOB basis typically). */
  productValue: number;
  /** Main freight to destination. */
  freight: number;
  /** Insurance premium. */
  insurance: number;
  /** Import duty as a percentage. */
  dutyRate: number;
  /** Other buyer-borne charges (handling, customs brokerage, inland haulage). */
  otherCharges: number;
  /** Units purchased, used for the per-unit cost. */
  quantity: number;
  /** The incoterm the goods are sold under. */
  incoterm: Incoterm;
}

export interface LandedCostResult {
  incoterm: Incoterm;
  /** Total landed cost to the importer. */
  landedCost: number;
  /** Landed cost per unit. */
  unitCost: number;
  /** Component breakdown. */
  freight: number;
  insurance: number;
  duty: number;
  otherCharges: number;
  productValue: number;
}

/**
 * Whether the seller's price already covers freight / insurance / duty for a
 * given incoterm. Anything NOT covered is an extra the importer pays on top.
 */
const SELLER_SCOPE: Record<Incoterm, { freight: boolean; insurance: boolean; duty: boolean }> = {
  EXW: { freight: false, insurance: false, duty: false },
  FCA: { freight: false, insurance: false, duty: false },
  FAS: { freight: false, insurance: false, duty: false },
  FOB: { freight: false, insurance: false, duty: false },
  CFR: { freight: true, insurance: false, duty: false },
  CIF: { freight: true, insurance: true, duty: false },
  CPT: { freight: true, insurance: false, duty: false },
  CIP: { freight: true, insurance: true, duty: false },
  DAP: { freight: true, insurance: false, duty: false },
  DPU: { freight: true, insurance: false, duty: false },
  DDP: { freight: true, insurance: true, duty: true }
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLandedCost(input: LandedCostInput): LandedCostResult {
  const scope = SELLER_SCOPE[input.incoterm];

  // Indian customs computes duty on CIF value (goods + freight + insurance).
  const cifValue = input.productValue + input.freight + input.insurance;
  const duty = round2((cifValue * input.dutyRate) / 100);
  const freight = scope.freight ? 0 : input.freight;
  const insurance = scope.insurance ? 0 : input.insurance;
  const otherCharges = scope.duty ? 0 : input.otherCharges;

  const landedCost = round2(input.productValue + freight + insurance + duty + otherCharges);
  const unitCost = input.quantity > 0 ? round2(landedCost / input.quantity) : 0;

  return {
    incoterm: input.incoterm,
    landedCost,
    unitCost,
    freight,
    insurance,
    duty,
    otherCharges,
    productValue: input.productValue
  };
}

/**
 * Compare the landed cost across every incoterm for the same base inputs.
 */
export function compareIncoterms(input: Omit<LandedCostInput, 'incoterm'>): LandedCostResult[] {
  const all: Incoterm[] = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
  return all.map((incoterm) => computeLandedCost({ ...input, incoterm }));
}
