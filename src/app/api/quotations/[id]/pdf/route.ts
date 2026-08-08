import { requireAuth, handleApiError } from '@/lib/api';
import { getQuotation } from '@/lib/services/quotations';
import { getCompanyProfile } from '@/lib/services/organizations';
import { generateDocumentPdf } from '@/lib/pdf';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { data: quotation, error } = await getQuotation(ctx.supabase, ctx.organizationId, id);
    if (error || !quotation) {
      return new Response('Quotation not found', { status: 404 });
    }

    const company = await getCompanyProfile(ctx.supabase, ctx.organizationId);
    const items = (quotation.items as Array<{
      description: string; hsn_code?: string | null; quantity: number; unit?: string | null;
      unit_price: number; amount: number;
    }>) ?? [];

    const pdfBytes = await generateDocumentPdf({
      title: 'EXPORT QUOTATION',
      documentNumber: quotation.quotation_number,
      date: new Date(quotation.created_at).toLocaleDateString('en-IN'),
      dueDate: quotation.expires_at ? new Date(quotation.expires_at).toLocaleDateString('en-IN') : undefined,
      companyName: company?.company_name ?? ctx.organizationName,
      companyDetails: [
        company?.address_line1 ?? '',
        [company?.city, company?.state, company?.country].filter(Boolean).join(', '),
        [company?.phone, company?.email].filter(Boolean).join(' | '),
        company?.iec_number ? `IEC: ${company.iec_number}` : '',
        company?.gst_number ? `GST: ${company.gst_number}` : ''
      ].filter(Boolean),
      buyerName: quotation.buyer_name,
      buyerCompany: quotation.buyer_company,
      buyerAddress: quotation.buyer_address,
      buyerCountry: quotation.buyer_country,
      currency: quotation.currency,
      incoterm: quotation.incoterm,
      paymentTerms: quotation.payment_terms,
      validityDays: quotation.validity_days,
      items: items.map((i) => ({
        description: i.description,
        hsnCode: i.hsn_code,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unit_price),
        amount: Number(i.amount)
      })),
      subtotal: Number(quotation.subtotal),
      discount: Number(quotation.discount),
      tax: Number(quotation.tax),
      freight: Number(quotation.freight),
      insurance: Number(quotation.insurance),
      total: Number(quotation.total),
      notes: quotation.notes,
      terms: quotation.terms
    });

    return new Response(new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quotation.quotation_number}.pdf"`
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}
