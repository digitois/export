import { notFound } from 'next/navigation';
import { getSite } from '@/lib/site/data';
import { InquiryForm } from '@/components/site/inquiry-form';

export default async function SiteContactPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
        CONTACT
      </p>
      <h1 className="mt-1 text-3xl font-bold">Contact {siteData.company_name}</h1>
      <p className="mt-2 text-zinc-600">Send us your requirements or ask for a quote.</p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div className="space-y-4 text-sm text-zinc-700">
          {siteData.contact_person && <p><span className="font-semibold text-zinc-900">Contact Person:</span> {siteData.contact_person}</p>}
          {siteData.contact_email && (
            <p><span className="font-semibold text-zinc-900">Email:</span> <a href={`mailto:${siteData.contact_email}`} className="hover:underline">{siteData.contact_email}</a></p>
          )}
          {siteData.contact_phone && (
            <p><span className="font-semibold text-zinc-900">Phone:</span> <a href={`tel:${siteData.contact_phone}`} className="hover:underline">{siteData.contact_phone}</a></p>
          )}
          {siteData.whatsapp_number && (
            <p>
              <span className="font-semibold text-zinc-900">WhatsApp:</span>{' '}
              <a href={`https://wa.me/${siteData.whatsapp_number.replace(/\D/g, '')}`} className="hover:underline">
                {siteData.whatsapp_number}
              </a>
            </p>
          )}
          {(siteData.address_line1 || siteData.city) && (
            <p>
              <span className="font-semibold text-zinc-900">Address:</span>{' '}
              {siteData.address_line1}
              {siteData.city ? `, ${siteData.city}` : ''}
              {siteData.state ? `, ${siteData.state}` : ''}
              {siteData.pincode ? ` - ${siteData.pincode}` : ''}
              {siteData.country ? `, ${siteData.country}` : ''}
            </p>
          )}
        </div>

        {siteData.show_inquiry_form && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Send an Inquiry</h2>
            <InquiryForm organizationId={siteData.organization_id} className="mt-4" contactEmail={siteData.contact_email} />
          </div>
        )}
      </div>
    </div>
  );
}