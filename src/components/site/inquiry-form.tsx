'use client';

import { useState } from 'react';

interface InquiryFormProps {
  organizationId: string;
  className?: string;
  contactEmail?: string | null;
}

export function InquiryForm({ organizationId, className = '', contactEmail }: InquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus('loading');
    try {
      const res = await fetch('/api/site/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          company_name: data.company ?? '',
          buyer_name: data.name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          country: data.country ?? '',
          product_interested: data.message ?? '',
          source: 'website'
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to submit');
      }
      setStatus('done');
      form.reset();
    } catch (err) {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className={className}>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="font-semibold text-green-800">Thank you! Your inquiry has been sent.</p>
          <p className="mt-1 text-sm text-green-700">We will get back to you within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`space-y-3 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Your name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email address"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="company"
          placeholder="Company name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <input
          name="country"
          placeholder="Country"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
      <input
        name="phone"
        placeholder="Phone / WhatsApp"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <textarea
        name="message"
        required
        rows={3}
        placeholder="What products & quantities are you interested in?"
        className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: 'var(--site-accent)' }}
      >
        {status === 'loading' ? 'Sending…' : 'Send Inquiry'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">
          Could not send your inquiry. Please email {contactEmail ? <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a> : 'us'} directly.
        </p>
      )}
    </form>
  );
}