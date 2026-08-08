import { requireAuth, handleApiError, ok, logActivity } from '@/lib/api';
import { blogGenerateSchema } from '@/lib/validations';
import { generateBlogContent } from '@/lib/ai';
import { getCompanyProfile } from '@/lib/services/organizations';
import { getOrgContext } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = blogGenerateSchema.parse(body);

    const org = await getOrgContext();
    const company = await getCompanyProfile(ctx.supabase, ctx.organizationId);

    const content = await generateBlogContent({
      keyword: parsed.keyword,
      targetCountry: parsed.targetCountry,
      targetProduct: parsed.targetProduct,
      title: parsed.title,
      tone: parsed.tone,
      companyName: company?.company_name ?? org.context?.organizationName
    });

    await logActivity(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      type: 'generated',
      entityType: 'blog_post',
      description: `AI-generated blog content for keyword "${parsed.keyword}"`
    });

    return ok(content);
  } catch (err) {
    return handleApiError(err);
  }
}
