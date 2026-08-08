import { requireAuth, handleApiError, ok, writeAudit, getIp } from '@/lib/api';
import { companyProfileSchema } from '@/lib/validations';
import { getCompanyProfile, upsertCompanyProfile } from '@/lib/services/organizations';

const SNAKE_TO_CAMEL: Record<string, string> = {
  company_name: 'companyName',
  logo_url: 'logoUrl',
  gst_number: 'gstNumber',
  iec_number: 'iecNumber',
  pan_number: 'panNumber',
  address_line1: 'addressLine1',
  address_line2: 'addressLine2',
  contact_person: 'contactPerson',
  year_established: 'yearEstablished',
  business_type: 'businessType',
  employee_count: 'employeeCount',
  factory_address: 'factoryAddress',
  certifications: 'certifications',
  export_markets: 'exportMarkets',
  product_categories: 'productCategories',
  social_links: 'socialLinks',
  brochure_url: 'brochureUrl',
  tagline: 'tagline',
  about: 'about',
  email: 'email',
  phone: 'phone',
  whatsapp: 'whatsapp',
  website: 'website',
  country: 'country',
  state: 'state',
  city: 'city',
  pincode: 'pincode'
};

function toCamelCase(row: Record<string, unknown> | null) {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[SNAKE_TO_CAMEL[key] ?? key] = value;
  }
  return out;
}

export async function GET() {
  try {
    const ctx = await requireAuth();
    const profile = await getCompanyProfile(ctx.supabase, ctx.organizationId);
    return ok(toCamelCase(profile ?? null));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();
    const parsed = companyProfileSchema.parse(body);

    const { data, error } = await upsertCompanyProfile(ctx.supabase, ctx.organizationId, parsed);
    if (error) return ok({ error: error.message }, { status: 400 });

    await writeAudit(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: 'update_company_profile',
      entityType: 'company_profile',
      entityId: ctx.organizationId,
      ip: getIp(request)
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
