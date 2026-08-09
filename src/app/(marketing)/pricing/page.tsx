import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import { fetchPlans, formatPrice, type Plan } from '../_lib/plans';
import { PricingCard } from '../_components/pricing-card';

export const metadata: Metadata = {
  title: 'Pricing'
};

const faqs = [
  {
    question: 'Do I need a credit card to start the free trial?',
    answer:
      'No. You can sign up and use Export OS for 14 days on the trial plan without entering any payment details.'
  },
  {
    question: 'Are the quotations and invoices GST-compliant?',
    answer:
      'Yes. Invoices are generated with your GSTIN, IEC and buyer details, and support all common INCOTERM and export invoice types.'},
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Absolutely. You can upgrade or downgrade your plan from Settings at any point, and the price adjusts from your next billing cycle.'
  },
  {
    question: 'Can I use my own domain for my export website?',
    answer:
      'Yes. The Professional and Enterprise plans include custom domain support so your export website lives at yourcompany.com.'
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major cards, UPI and net banking in India through Razorpay. Invoices are billed monthly or annually.'
  }
];

function planFeatures(plans: Plan[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const plan of plans) {
    for (const feature of plan.features) {
      if (!seen.has(feature)) {
        seen.add(feature);
        order.push(feature);
      }
    }
  }
  return order;
}

export default async function PricingPage() {
  const plans = await fetchPlans();
  const comparison = planFeatures(plans);

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
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, honest pricing</h1>
            <p className="mt-4 text-lg text-slate-300">
              Every plan includes a 14-day free trial. Pay in INR. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-14 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Plans are being finalised</h2>
              <p className="mt-2 text-sm text-slate-500">
                Our pricing plans are coming soon. Sign up now for early access and lock in launch pricing.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Get early access
              </Link>
              <p className="mt-4 text-sm text-slate-400">
                Need more information?{' '}
                <Link href="/contact" className="font-semibold text-slate-900 underline underline-offset-4">
                  Contact us
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} highlighted={plan.code === 'professional'} />
              ))}
            </div>
          )}

          {plans.length > 1 && comparison.length > 0 && (
            <div className="mt-24">
              <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Compare features
              </h2>
              <p className="mt-3 text-center text-slate-500">
                Everything you need to pick the right plan for your export business.
              </p>
              <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900">Features</th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="px-6 py-4 text-left font-semibold text-slate-900">
                          {plan.name}
                          <div className="mt-1 text-xs font-normal text-slate-500">
                            {formatPrice(plan.price_monthly, plan.currency)}/mo
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((feature) => (
                      <tr key={feature} className="border-b border-slate-100 last:border-0">
                        <td className="px-6 py-3.5 text-slate-700">{feature}</td>
                        {plans.map((plan) => {
                          const included = plan.features.includes(feature);
                          return (
                            <td key={plan.id} className="px-6 py-3.5">
                              {included ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Minus className="h-4 w-4 text-slate-300" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-24 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            <ShieldCheck className="mx-auto h-5 w-5 text-slate-400" />
            <p className="mt-2">
              All plans include SSL security, GDPR-friendly data handling and support for Indian tax
              compliance.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-slate-200 bg-white p-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {faq.question}
                  <span className="text-slate-400 transition-transform group-open:rotate-45">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start exporting today</h2>
          <p className="mt-4 text-slate-300">
            Join the Indian exporters growing with Export OS. Free for 14 days, no strings attached.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
            >
              Start free trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}