import { requireAuth, handleApiError, ok, logActivity } from '@/lib/api';
import { z } from 'zod';
import { generateHSRecommendation, generateProductDescription, draftEmail, completeChat } from '@/lib/ai';
import { getCompanyProfile } from '@/lib/services/organizations';

const assistSchema = z.object({
  type: z.enum(['hs_code', 'product_description', 'email_drafting', 'market_suggestions', 'documentation']),
  data: z.record(z.unknown()).default({})
});

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = assistSchema.parse(body);

    let result: unknown;
    let description = '';

    switch (parsed.type) {
      case 'hs_code': {
        const productName = String(parsed.data.productName ?? '');
        result = await generateHSRecommendation(productName, String(parsed.data.description ?? ''));
        description = `HS code suggestion for "${productName}"`;
        break;
      }
      case 'product_description': {
        result = await generateProductDescription({
          name: String(parsed.data.productName ?? ''),
          description: parsed.data.description ? String(parsed.data.description) : null,
          technicalSpecifications: (parsed.data.technicalSpecifications as Record<string, string>) ?? {},
          targetCountry: parsed.data.targetCountry ? String(parsed.data.targetCountry) : null
        });
        description = 'AI product description generation';
        break;
      }
      case 'email_drafting': {
        const company = await getCompanyProfile(ctx.supabase, ctx.organizationId);
        result = await draftEmail({
          purpose: String(parsed.data.purpose ?? 'general buyer communication'),
          context: String(parsed.data.context ?? ''),
          tone: parsed.data.tone ? String(parsed.data.tone) : 'professional'
        });
        result = { email: result, company: company?.company_name };
        description = 'AI email drafting';
        break;
      }
      case 'market_suggestions': {
        const company = await getCompanyProfile(ctx.supabase, ctx.organizationId);
        const completion = await completeChat([
          {
            role: 'user',
            content: `Suggest 5 best international markets for this exporter:\nCompany: ${company?.company_name ?? ''}\nProducts: ${String(parsed.data.products ?? '')}\nReturn concise JSON: { "markets": [{ "country", "demand", "regulations", "strategy" }], "notes" }.`
          }
        ]);
        result = parseLooseJson(completion.content);
        description = 'AI market suggestions';
        break;
      }
      case 'documentation': {
        const completion = await completeChat([
          {
            role: 'user',
            content: `Provide export documentation guidance for:\nProduct: ${String(parsed.data.product ?? '')}\nDestination: ${String(parsed.data.country ?? '')}\nIncoterm: ${String(parsed.data.incoterm ?? 'FOB')}\nList required documents, compliance checks and step-by-step process. Return JSON: { "documents": string[], "process": string[], "notes": string }.`
          }
        ]);
        result = parseLooseJson(completion.content);
        description = 'AI export documentation guidance';
        break;
      }
    }

    await logActivity(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      type: 'generated',
      entityType: 'ai_assist',
      description
    });

    return ok({ type: parsed.type, result });
  } catch (err) {
    return handleApiError(err);
  }
}

function parseLooseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    return { raw };
  }
}
