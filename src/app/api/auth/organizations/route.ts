import { createOrganizationSchema } from '@/lib/validations';
import { createServiceClient } from '@/lib/supabase/service';
import { ApiError, handleApiError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { randomBytes } from 'node:crypto';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError('Authentication required', 401);

    const body = await request.json();
    const parsed = createOrganizationSchema.parse(body);

    const service = createServiceClient();
    const baseSlug = slugify(parsed.slug || parsed.name);
    let slug = baseSlug;

    const { data: existing } = await service.from('organizations').select('id').eq('slug', slug).maybeSingle();
    if (existing) slug = `${baseSlug}-${randomBytes(2).toString('hex')}`;

    const { data: org, error } = await service
      .from('organizations')
      .insert({ name: parsed.name, slug, website_subdomain: slug, status: 'trial' })
      .select()
      .single();

    if (error) throw new ApiError(error.message, 500);

    const { error: memberError } = await service.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
      status: 'active'
    });

    if (memberError) throw new ApiError(memberError.message, 500);

    return ok({ id: org.id, slug });
  } catch (err) {
    return handleApiError(err);
  }
}
