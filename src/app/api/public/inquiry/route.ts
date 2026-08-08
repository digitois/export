import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicInquirySchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail, isSesConfigured, emailLayout } from '@/lib/email';
import { runWorkflows } from '@/lib/services/workflows';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success } = rateLimit(`inquiry:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = publicInquirySchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase.from('leads').insert({
      organization_id: parsed.organizationId,
      company_name: parsed.companyName,
      buyer_name: parsed.buyerName,
      email: parsed.email,
      phone: parsed.phone,
      country: parsed.country,
      product_interested: parsed.productInterested,
      notes: parsed.message,
      source: 'website',
      priority: 'medium',
      status: 'new',
      metadata: { origin: 'public_site' }
    }).select().single();

    if (error) {
      return NextResponse.json({ error: 'Could not submit your inquiry' }, { status: 400 });
    }

    // Trigger inquiry_received email automations (best-effort)
    const service = createServiceClient();
    await runWorkflows(service, {
      trigger: 'inquiry_received',
      organizationId: parsed.organizationId,
      lead: {
        id: data?.id ?? '',
        email: parsed.email,
        name: parsed.buyerName,
        company: parsed.companyName ?? null,
        country: parsed.country ?? null
      }
    });

    if (isSesConfigured()) {
      try {
        const { data: org } = await service
          .from('organizations')
          .select('name, billing_email')
          .eq('id', parsed.organizationId)
          .single();

        await sendEmail({
          to: org?.billing_email ?? 'sales@exportos.com',
          subject: `New website inquiry from ${parsed.buyerName}`,
          html: emailLayout(
            'New inquiry received',
            `<p><strong>${parsed.buyerName}</strong> submitted an inquiry via your website.</p>
             <ul>
               <li>Company: ${parsed.companyName ?? '-'}</li>
               <li>Email: ${parsed.email}</li>
               <li>Phone: ${parsed.phone ?? '-'}</li>
               <li>Country: ${parsed.country ?? '-'}</li>
               <li>Product interest: ${parsed.productInterested ?? '-'}</li>
               <li>Message: ${parsed.message ?? '-'}</li>
             </ul>`
          )
        });
      } catch {
        // notification email is best-effort
      }
    }

    return NextResponse.json({ data: { id: data?.id } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
