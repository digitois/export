import { requireAuth, handleApiError } from '@/lib/api';
import { getInvoice } from '@/lib/services/invoices';
import { getCompanyProfile } from '@/lib/services/organizations';
import { generateDocumentPdf } from '@/lib/pdf';

const TYPE_TITLES: Record<string, string> = {
  commercial: 'COMMERCIAL INVOICE',
  proforma: 'PROFORMA INVOICE',
  credit_note: 'CREDIT NOTE',
  debit_note: 'DEBIT NOTE'
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { data: invoice, error } = await getInvoice(ctx.supabase, ctx.organizationId, id);
    if (error || !invoice) return new Response('Invoice not found', { status: 404 });

    const company = await getCompanyProfile(ctx.supabase, ctx.organizationId);
    const items = (invoice.items as Array<{
      description: string; hsn_code?: string | null; quantity: number; unit?: string | null;
      unit_price: number; amount: number;
    }>) ?? [];

    const pdfBytes = await generateDocumentPdf({
      title: TYPE_TITLES[invoice.invoice_type] ?? 'INVOICE',
      documentNumber: invoice.invoice_number,
      date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
      dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
      companyName: company?.company_name ?? ctx.organizationName,
      companyDetails: [
        company?.address_line1 ?? '',
        [company?.city, company?.state, company?.country].filter(Boolean).join(', '),
        [company?.phone, company?.email].filter(Boolean).join(' | '),
        company?.iec_number ? `IEC: ${company.iec_number}` : '',
        company?.gst_number ? `GST: ${company.gst_number}` : ''
      ].filter(Boolean),
      buyerName: invoice.buyer_name,
      buyerCompany: invoice.buyer_company,
      buyerAddress: invoice.buyer_address,
      buyerCountry: invoice.buyer_country,
      currency: invoice.currency,
      paymentTerms: invoice.payment_terms,
      items: items.map((i) => ({
        description: i.description,
        hsnCode: i.hsn_code,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unit_price),
        amount: Number(i.amount)
      })),
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      notes: invoice.notes
    });

    return new Response(new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}
