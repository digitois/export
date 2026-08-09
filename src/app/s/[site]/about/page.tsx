import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSite } from '@/lib/site/data';
import { InquiryForm } from '@/components/site/inquiry-form';

interface Props {
  params: Promise<{ site: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params;
  const data = await getSite(decodeURIComponent(site));
  return { title: `About Us | ${data?.company_name ?? 'Company'}` };
}

export default async function SiteAboutPage({ params }: Props) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));

  if (!siteData) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>ABOUT US</p>
        <h1 className="mt-2 text-4xl font-bold" style={{ fontFamily: 'var(--site-heading-font)' }}>
          {siteData.company_name}
        </h1>
        {siteData.tagline && <p className="mt-3 text-lg text-zinc-600">{siteData.tagline}</p>}
      </div>

      <div className="space-y-10">
        {siteData.about && (
          <div>
            <h2 className="text-2xl font-bold">Who We Are</h2>
            <p className="mt-3 leading-relaxed text-zinc-600">{siteData.about}</p>
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2">
          {siteData.iec_number && (
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold">IEC Number</h3>
              <p className="mt-1 text-sm text-zinc-600">{siteData.iec_number}</p>
            </div>
          )}
          {siteData.address_line1 && (
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold">Location</h3>
              <p className="mt-1 text-sm text-zinc-600">
                {siteData.address_line1}
                {siteData.city ? `, ${siteData.city}` : ''}
                {siteData.state ? `, ${siteData.state}` : ''}
                {siteData.country ? `, ${siteData.country}` : ''}
              </p>
            </div>
          )}
          {siteData.export_markets && siteData.export_markets.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold">Export Markets</h3>
              <p className="mt-1 text-sm text-zinc-600">{siteData.export_markets.join(', ')}</p>
            </div>
          )}
          {siteData.certifications && siteData.certifications.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold">Certifications</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {siteData.certifications.map((cert) => (
                  <span key={cert} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ color: 'var(--site-accent)', borderColor: 'color-mix(in srgb, var(--site-accent) 40%, transparent)' }}>
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {siteData.show_inquiry_form && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="text-xl font-bold">Partner With Us</h3>
            <p className="mt-1 text-sm text-zinc-500">Tell us what you need — we respond within 24 hours.</p>
            <InquiryForm organizationId={siteData.organization_id} className="mt-4" contactEmail={siteData.contact_email} />
          </div>
        )}
      </div>
    </div>
  );
}
