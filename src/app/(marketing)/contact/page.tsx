import type { Metadata } from 'next';
import { ArrowUpRight, Clock, Mail, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact'
};

const contactEmail = 'contact@exportos.com';

const contactCards = [
  {
    icon: Mail,
    label: 'Email us',
    value: 'contact@exportos.com',
    detail: 'For sales, support and partnership enquiries'
  },
  {
    icon: MapPin,
    label: 'Headquarters',
    value: 'Mumbai, Maharashtra',
    detail: 'Serving exporters across all of India'
  },
  {
    icon: Clock,
    label: 'Support hours',
    value: 'Mon – Sat, 9AM – 7PM IST',
    detail: 'We typically reply within one business day'
  }
];

export default function ContactPage() {
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    'Contacting Export OS'
  )}&body=${encodeURIComponent("Hi Export OS team,\n\nI'd like to learn more about your platform.\n\nName:\nCompany:\n")}`;

  return (
    <div className="pt-14">
      <section className="relative overflow-hidden bg-[#041902] text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgb(11 107 99 / 0.25) 0%, transparent 60%)'
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Get in touch</h1>
            <p className="mt-4 text-lg text-white/70">
              Questions about Export OS, your current plan or a custom package? We&rsquo;d love to hear
              from you.
            </p>
            <a
              href={mailtoHref}
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#041902] transition-colors hover:bg-white/90"
            >
              <Mail className="h-4 w-4" />
              Email our team
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {contactCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#363D42]/10 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B6B63] text-white">
                  <card.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-base font-semibold text-[#363D42]">{card.label}</h2>
                <p className="mt-1 font-medium text-[#363D42]/80">{card.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#363D42]/60">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-[#F7F8FA] p-8 text-center">
            <h2 className="text-lg font-semibold text-[#363D42]">Prefer to write to us directly?</h2>
            <p className="mt-2 text-sm text-[#363D42]/60">
              Send us an email and our team will get back to you within one business day.
            </p>
            <a
              href={mailtoHref}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#041902] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6B63]"
            >
              {contactEmail}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}