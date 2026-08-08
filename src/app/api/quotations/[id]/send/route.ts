import { requireAuth, handleApiError, ok } from '@/lib/api';
import { getQuotation, setQuotationStatus } from '@/lib/services/quotations';
import { sendEmail, emailLayout, isSesConfigured } from '@/lib/email';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;

    const { data: quotation } = await getQuotation(ctx.supabase, ctx.organizationId, id);
    if (!quotation) return ok({ error: 'Quotation not found' }, { status: 404 });

    const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/quotations/${id}/pdf`, {
      headers: { cookie: _request.headers.get('cookie') ?? '' }
    });

    let error: string | null = null;
    if (quotation.buyer_email && isSesConfigured()) {
      const pdfBuffer = pdfRes.ok ? Buffer.from(await pdfRes.arrayBuffer()) : undefined;
      const result = await sendEmail({
        to: quotation.buyer_email,
        subject: `Quotation ${quotation.quotation_number} from ${ctx.organizationName}`,
        html: emailLayout(
          'Your export quotation',
          `<p>Dear ${quotation.buyer_name},</p>
           <p>Please find our quotation <strong>${quotation.quotation_number}</strong> attached. Total: <strong>${quotation.currency} ${Number(quotation.total).toFixed(2)}</strong> (${quotation.incoterm}).</p>
           <p>We look forward to your response. The quotation is valid until ${quotation.expires_at ? new Date(quotation.expires_at).toLocaleDateString('en-IN') : 'the expiry date'}.</p>`
        )
      });
      error = result.error ?? null;
    }

    if (!error) {
      await setQuotationStatus(ctx.supabase, ctx.organizationId, id, 'sent');
    }

    return ok({ sent: !error, error });
  } catch (err) {
    return handleApiError(err);
  }
}
