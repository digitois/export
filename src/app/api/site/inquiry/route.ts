import { createSiteClient } from '@/lib/supabase/site';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organization_id, company_name, buyer_name, email, phone, country, product_interested, source } = body;

    if (!organization_id || !email) {
      return NextResponse.json({ error: 'Organization and email are required.' }, { status: 400 });
    }

    const supabase = createSiteClient();
    const { error } = await supabase.from('leads').insert({
      organization_id,
      company_name: company_name || null,
      buyer_name: buyer_name || null,
      email,
      phone: phone || null,
      country: country || null,
      product_interested: product_interested || null,
      source: source || 'website',
      status: 'new'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}