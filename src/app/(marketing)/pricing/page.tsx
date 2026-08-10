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
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, honest pricing
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Every plan includes a free trial. Pay in INR. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#363D42]/20 bg-[#F7F8FA] p-14 text-center">
              <h2 className="text-lg font-semibold text-[#363D42]">Plans are being finalised</h2>
              <p className="mt-2 text-sm text-[#363D42]/60">
                Our pricing plans are coming soon. Sign up now for early access and lock in launch pricing.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex h-10 items-center rounded-full bg-[#041902] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0B6B63]"
              >
                Get early access
              </Link>
              <p className="mt-4 text-sm text-[#363D42]/50">
                Need more information?{' '}
                <Link href="/contact" className="font-semibold text-[#0B6B63] underline underline-offset-4">
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
              <h2 className="text-center font-display text-2xl font-bold tracking-tight text-[#363D42] sm:text-3xl">
                Compare features
              </h2>
              <p className="mt-3 text-center text-[#363D42]/60">
                Everything you need to pick the right plan for your export business.
              </p>
              <div className="mt-10 overflow-x-auto rounded-2xl border border-[#363D42]/10">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#363D42]/10 bg-[#F7F8FA]">
                      <th className="px-6 py-4 text-left font-semibold text-[#363D42]">Features</th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="px-6 py-4 text-left font-semibold text-[#363D42]">
                          {plan.name}
                          <div className="mt-1 text-xs font-normal text-[#363D42]/50">
                            {formatPrice(plan.price_monthly, plan.currency)}/mo
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((feature) => (
                      <tr key={feature} className="border-b border-[#363D42]/10 last:border-0">
                        <td className="px-6 py-3.5 text-[#363D42]/80">{feature}</td>
                        {plans.map((plan) => {
                          const included = plan.features.includes(feature);
                          return (
                            <td key={plan.id} className="px-6 py-3.5">
                              {included ? (
                                <Check className="h-4 w-4 text-[#0B6B63]" />
                              ) : (
                                <Minus className="h-4 w-4 text-[#363D42]/30" />
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

          <div className="mt-24 rounded-2xl bg-[#F7F8FA] p-6 text-center text-sm text-[#363D42]/60">
            <ShieldCheck className="mx-auto h-5 w-5 text-[#0B6B63]" />
            <p className="mt-2">
              All plans include SSL security, GDPR-friendly data handling and support for Indian tax
              compliance. Secure payments via Razorpay and Stripe.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F8FA] py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-[#363D42] sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-[#363D42]/10 bg-white p-6 open:bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#363D42]">
                  {faq.question}
                  <span className="text-[#0B6B63] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#363D42]/60">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#041902] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Start exporting today
          </h2>
          <p className="mt-4 text-white/70">
            Join the Indian exporters growing with Export OS. Free to explore, no strings attached.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#041902] transition-colors hover:bg-white/90"
            >
              Start free trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}