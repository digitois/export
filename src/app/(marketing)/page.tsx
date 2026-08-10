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
  Star,
  Ship,
  ReceiptText,
  Wallet,
  Warehouse
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchPlans, type Plan } from './_lib/plans';
import { PricingCard } from './_components/pricing-card';
import { AppMockup } from './_components/app-mockup';

export const metadata: Metadata = {
  title: 'Export Smarter. Grow Faster.'
};

const modules = [
  {
    icon: Contact,
    color: '#0EA5E9',
    title: 'Buyer CRM',
    description: 'Track leads, buyers and enquiries from one place with statuses and follow-up reminders.'
  },
  {
    icon: Barcode,
    color: '#D97706',
    title: 'HSN Code Search',
    description: 'Find the right HSN code in seconds with instant search across the full ITC-HS tariff schedule.'
  },
  {
    icon: ReceiptText,
    color: '#3B82F6',
    title: 'Quotations & Invoices',
    description: 'Generate INCOTERM-aware quotations and commercial invoices with correct GST and IEC details.'
  },
  {
    icon: Ship,
    color: '#7C3AED',
    title: 'Shipments & Logistics',
    description: 'Track shipments, packing lists, certificates of origin and landed-cost estimates end to end.'
  },
  {
    icon: Wallet,
    color: '#059669',
    title: 'Finance',
    description: 'Receivables, payables and a unified ledger that reflects every order, dispatch and collection.'
  },
  {
    icon: Warehouse,
    color: '#E11D48',
    title: 'Inventory & Warehouses',
    description: 'Live stock, batch tracking, purchase orders and warehouse management across locations.'
  },
  {
    icon: Globe,
    color: '#0B6B63',
    title: 'Website Builder',
    description: 'Launch a professional export website with products, media and SEO — no developer needed.'
  },
  {
    icon: Mail,
    color: '#8B5CF6',
    title: 'Email Marketing',
    description: 'Reach overseas buyers with campaigns, templates and analytics built for export teams.'
  },
  {
    icon: Sparkles,
    color: '#F59E0B',
    title: 'AI Assistant',
    description: 'Draft buyer emails, product descriptions and export documentation with an AI that knows Indian trade.'
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

const faqs = [
  {
    q: 'We already use spreadsheets and WhatsApp — why switch?',
    a: 'Spreadsheets and WhatsApp break down as your order volume grows. Export OS connects every step — quotations flow into invoices, shipments update inventory, and collections hit the ledger automatically. You stop re-entering the same data twice.'
  },
  {
    q: "We're a small export unit. Is this overkill for us?",
    a: 'Export OS is built for exactly this size of business. Start with the modules you need — HS codes, quotations, buyers — and switch the rest on when you grow. The free plan gives you full access with no credit card required.'
  },
  {
    q: 'How long does it actually take to get set up?',
    a: 'Most exporters go from signup to their first quotation in under 30 minutes. Add your company profile, products and HS codes, and you are ready to quote.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept cards, UPI, net banking and wallets in India via Razorpay, with international card support via Stripe. Billing is instant and plans activate immediately after payment.'
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Your data is encrypted in transit and at rest on bank-grade infrastructure, isolated per organization, and you can export everything at any time.'
  },
  {
    q: 'Can I get a demo?',
    a: 'Absolutely. Start a free trial to explore on your own, or contact our team for a guided walkthrough tailored to your export workflow.'
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
    <div>
      <section className="relative overflow-hidden bg-[#041902] text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgb(11 107 99 / 0.25) 0%, transparent 60%), radial-gradient(40% 40% at 80% 20%, rgb(11 107 99 / 0.15) 0%, transparent 70%)'
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium text-white/70">
              <Star className="h-3.5 w-3.5 text-[#0B6B63]" />
              Built for Indian exporters
            </span>
            <h1 className="animate-fade-up mt-6 font-display text-4xl font-bold tracking-tight [animation-delay:80ms] sm:text-6xl">
              Your entire export business.
              <br />
              <span className="text-[#0B6B63]">One platform.</span>
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-white/70 [animation-delay:160ms]">
              HSN code search, an export website builder, quotations, invoices, shipments and email
              marketing — the operating system for Indian export businesses in one place.
            </p>
            <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#041902] transition-all hover:bg-white/90"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
            <p className="animate-fade-up mt-4 text-xs text-white/50 [animation-delay:300ms]">
              Free to explore · No credit card required · Set up in minutes
            </p>

            <div className="animate-fade-up mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 [animation-delay:320ms] sm:grid-cols-4">
              {[
                { code: 'IEC', label: 'Import-Export Code' },
                { code: 'GST', label: 'GST Ready' },
                { code: 'INCOTERMS', label: '2020 Support' },
                { code: 'ITC-HS', label: 'Tariff Search' }
              ].map((marker) => (
                <div key={marker.code} className="bg-[#041902] px-4 py-3 text-left">
                  <p className="font-display text-sm font-bold tracking-wide text-[#0B6B63]">{marker.code}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">{marker.label}</p>
                </div>
              ))}
            </div>
          </div>

          <AppMockup />
        </div>
      </section>

      <section className="border-b border-[#363D42]/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#363D42]/40">
            Trusted by export teams across India
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 text-center sm:grid-cols-3 lg:grid-cols-6">
            {trustedBy.map((name) => (
              <span key={name} className="text-sm font-medium text-[#363D42]/40">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="scroll-mt-16 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#363D42] sm:text-4xl">
              Everything your export business needs. One intelligent system.
            </h2>
            <p className="mt-4 text-[#363D42]/60">
              Every module feeds data into a shared layer — quotations flow into invoices, shipments
              update inventory, and collections hit your ledger automatically.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-[#363D42]/10 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${feature.color}17`, color: feature.color }}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#363D42]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#363D42]/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F8FA] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#363D42] sm:text-4xl">
              Get exporting in three steps
            </h2>
            <p className="mt-4 text-[#363D42]/60">From zero to first quotation in a single afternoon.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-[#363D42]/10 bg-white p-6">
                <span className="font-display text-sm font-bold text-[#0B6B63]">{item.step}</span>
                <h3 className="mt-3 text-lg font-semibold text-[#363D42]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#363D42]/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {plans.length > 0 && (
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#363D42] sm:text-4xl">
                Simple pricing that grows with you
              </h2>
              <p className="mt-4 text-[#363D42]/60">
                Start free. No credit card required — cancel anytime. Secure payment via Razorpay and
                Stripe, instant activation.
              </p>
            </div>
          )}
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {plans.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-[#363D42]/20 bg-[#F7F8FA] p-12 text-center">
                <h3 className="text-lg font-semibold text-[#363D42]">Plans are being finalised</h3>
                <p className="mt-2 text-sm text-[#363D42]/60">
                  Our pricing plans are coming soon. Join now for the early access trial while we finish
                  things up.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex h-10 items-center rounded-full bg-[#041902] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0B6B63]"
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
            <p className="mt-10 text-center text-sm text-[#363D42]/60">
              Need a custom package?{' '}
              <Link href="/contact" className="font-semibold text-[#0B6B63] underline underline-offset-4">
                Talk to our team
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="bg-[#F7F8FA] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#363D42] sm:text-4xl">
              Loved by exporters
            </h2>
            <p className="mt-4 text-[#363D42]/60">What early adopters are saying about Export OS.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <figure key={item.name} className="rounded-2xl border border-[#363D42]/10 bg-white p-6">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#0B6B63] text-[#0B6B63]" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-[#363D42]/80">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-[#363D42]/10 pt-4">
                  <div className="font-semibold text-[#363D42]">{item.name}</div>
                  <div className="text-sm text-[#363D42]/50">{item.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 bg-white py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#363D42] sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-[#363D42]/60">Everything you need to know before you start.</p>
          </div>
          <div className="mt-16 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-[#363D42]/10 bg-white px-6 py-5 open:bg-[#F7F8FA]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#363D42]">
                  {faq.q}
                  <span className="text-[#0B6B63] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#363D42]/60">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#041902] py-24 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Stop guessing. Start exporting.
          </h2>
          <p className="mt-4 text-white/70">
            Join the exporters scaling their businesses with Export OS. Start free in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#041902] transition-all hover:bg-white/90"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
