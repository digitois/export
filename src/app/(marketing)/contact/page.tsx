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
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgb(30 41 59 / 0.5) 0%, transparent 60%)'
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get in touch</h1>
            <p className="mt-4 text-lg text-slate-300">
              Questions about Export OS, your current plan or a custom package? We&rsquo;d love to hear
              from you.
            </p>
            <a
              href={mailtoHref}
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
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
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <card.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-base font-semibold text-slate-900">{card.label}</h2>
                <p className="mt-1 font-medium text-slate-700">{card.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-slate-50 p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Prefer to write to us directly?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Send us an email and our team will get back to you within one business day.
            </p>
            <a
              href={mailtoHref}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
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