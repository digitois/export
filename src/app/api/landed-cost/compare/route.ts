import { requireAuth, handleApiError, ok } from '@/lib/api';
import { landedCostSchema } from '@/lib/validations';
import { compareIncoterms } from '@/lib/services/landed-cost';

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = landedCostSchema.omit({ name: true, notes: true }).parse(body);

    const results = compareIncoterms({
      productValue: parsed.productValue,
      freight: parsed.freight,
      insurance: parsed.insurance,
      dutyRate: parsed.dutyRate,
      otherCharges: parsed.otherCharges,
      quantity: parsed.quantity
    });

    return ok(results);
  } catch (err) {
    return handleApiError(err);
  }
}
