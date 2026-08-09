import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Barcode,
  Contact,
  FileText,
  Globe,
  Mail,
  Sparkles,
  Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchPlans, type Plan } from './_lib/plans';
import { PricingCard } from './_components/pricing-card';
import { AppMockup } from './_components/app-mockup';

export const metadata: Metadata = {
  title: 'Export Smarter. Grow Faster.'
};

const features = [
  {
    icon: Barcode,
    title: 'HSN Code Search',
    description:
      'Find the right HSN code in seconds with instant search across the full ITC-HS tariff schedule.'
  },
  {
    icon: Globe,
    title: 'Website Builder',
    description:
      'Launch a professional export website with products, media and SEO — no developer needed.'
  },
  {
    icon: FileText,
    title: 'Quotations & Invoices',
    description:
      'Generate INCOTERM-aware quotations and commercial invoices with correct GST and IEC details.'
  },
  {
    icon: Contact,
    title: 'Buyer CRM',
    description:
      'Track leads, buyers and enquiries from one place with statuses and follow-up reminders.'
  },
  {
    icon: Mail,
    title: 'Email Marketing',
    description:
      'Reach overseas buyers with campaigns, templates and analytics built for export teams.'
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    description:
      'Draft buyer emails, product descriptions and export documentation with an AI that knows Indian trade.'
  }
];

const steps = [
  {
    step: '01',
    title: 'Set up your export profile',
    description: 'Add your company details, IEC, GSTIN and products in minutes.'
  },
  {
    step: '02',
    title: 'Look up HS codes & pricing',
    description: 'Search correct ITC-HS codes and build quotations with freight and insurance.'
  },
  {
    step: '03',
    title: 'Publish & grow',
    description: 'Go live with your website, run campaigns and turn enquiries into orders.'
  }
];

const testimonials = [
  {
    quote: 'We replaced three separate tools with one. HS code search alone saves us an hour a day.',
    name: 'Rakesh Patel',
    role: 'Director, VIPB Leather Exports, Kanpur'
  },
  {
    quote: 'Our export website looks better than anything we could have built before existing.',
    name: 'Meena Rajan',
    role: 'Co-founder, Nirvana Spice Traders, Kochi'
  },
  {
    quote: 'Quotations and invoices used to take us a whole evening. Export OS does it in minutes.',
    name: 'Arvind Gupta',
    role: 'Export Manager, Ganga Textiles, Surat'
  }
];

const trustedBy = ['Swadeshi Metals', 'Coastal Cashew Co.', 'Aryan Agri Exports', 'Ganges Textiles', 'IndOverseas Foods', 'Royal Ceramics'];

export default async function MarketingHomePage() {
  let plans: Plan[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      redirect('/dashboard');
    }
    plans = await fetchPlans();
  } catch {
    plans = await fetchPlans();
  }

  return (
    <div className="pt-14">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgb(30 41 59 / 0.6) 0%, transparent 60%), radial-gradient(40% 40% at 80% 20%, rgb(16 185 129 / 0.15) 0%, transparent 70%)'
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium text-slate-300">
              <Star className="h-3.5 w-3.5 text-emerald-400" />
              Built for Indian exporters
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Export Smarter.
              <br />
              <span className="text-slate-400">Grow Faster.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              HSN code search, an export website builder, quotations, invoices and email marketing — the
              operating system for Indian export businesses in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>

          <AppMockup />
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Trusted by export teams across India
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 text-center sm:grid-cols-3 lg:grid-cols-6">
            {trustedBy.map((name) => (
              <span key={name} className="text-sm font-medium text-slate-400">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to export, in one place
            </h2>
            <p className="mt-4 text-slate-500">
              Stop juggling spreadsheets, design tools and email. Export OS brings your full trade workflow
              together.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Get exporting in three steps
            </h2>
            <p className="mt-4 text-slate-500">From zero to first quotation in a single afternoon.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-sm font-bold text-emerald-600">{item.step}</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {plans.length > 0 && (
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Simple pricing that grows with you
              </h2>
              <p className="mt-4 text-slate-500">
                Start free for 14 days. No credit card required — cancel anytime.
              </p>
            </div>
          )}
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {plans.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <h3 className="text-lg font-semibold text-slate-900">Plans are being finalised</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Our pricing plans are coming soon. Join now for the early access trial while we finish
                  things up.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex h-10 items-center rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Get early access
                </Link>
              </div>
            ) : (
              plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} highlighted={plan.code === 'professional'} />
              ))
            )}
          </div>
          {plans.length > 0 && (
            <p className="mt-10 text-center text-sm text-slate-500">
              Need a custom package?{' '}
              <Link href="/contact" className="font-semibold text-slate-900 underline underline-offset-4">
                Talk to our team
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Loved by exporters
            </h2>
            <p className="mt-4 text-slate-500">What early adopters are saying about Export OS.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <figure key={item.name} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-slate-600">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-slate-100 pt-4">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-500">{item.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to export smarter?</h2>
          <p className="mt-4 text-slate-300">
            Join the exporters scaling their businesses with Export OS. Start free in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}