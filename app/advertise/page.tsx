/**
 * Advertise Page — app/advertise/page.tsx
 *
 * Simple "Advertise with us" page for direct ad sales.
 * Shows audience stats, placement options, and a contact form.
 * No payment integration yet — starts as email-based manual process.
 * Later: add Paystack payment + dashboard for self-serve.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertise",
  description: "Reach an anonymous, engaged adult audience on Inkognito.",
};

export default function AdvertisePage() {
  return (
    <div className="container-ink py-16 max-w-3xl">
      {/* Header */}
      <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-4">
        Advertise with us
      </p>
      <h1 className="heading-editorial text-4xl md:text-5xl text-[var(--white)] mb-6">
        Reach people who are
        <br />
        <em>paying attention.</em>
      </h1>
      <p className="text-[var(--ash)] text-base leading-relaxed mb-12 max-w-xl">
        Inkognito users are engaged, anonymous, and present. No bots, no passive scrollers — people come here to feel something.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px mb-12">
        {[
          { value: "100%", label: "Anonymous audience" },
          { value: "18+", label: "Age-verified users" },
          { value: "High", label: "Engagement rate" },
        ].map((s) => (
          <div key={s.label} className="border border-[var(--border)] p-6 bg-[var(--surface)] text-center">
            <p className="font-display font-bold text-3xl text-[var(--white)] mb-1">{s.value}</p>
            <p className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Placements */}
      <h2 className="heading-editorial text-2xl text-[var(--white)] mb-6">
        Ad Placements
      </h2>
      <div className="space-y-px mb-12">
        {[
          {
            name: "Feed Banner",
            size: "728×90",
            desc: "Horizontal banner between confession cards. Highest visibility.",
            price: "Contact for rates",
          },
          {
            name: "Sidebar Box",
            size: "300×250",
            desc: "Sticky sidebar placement. Visible throughout feed scrolling.",
            price: "Contact for rates",
          },
          {
            name: "Companion Sponsor",
            size: "Text only",
            desc: "Subtle 'Powered by' placement on AI companion page.",
            price: "Contact for rates",
          },
        ].map((p) => (
          <div key={p.name} className="border border-[var(--border)] p-5 bg-[var(--surface)] flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-[var(--white)] font-display font-bold">{p.name}</h3>
                <span className="font-mono text-[10px] text-[var(--dim)] border border-[var(--border)] px-2 py-0.5 uppercase">
                  {p.size}
                </span>
              </div>
              <p className="text-[var(--ash)] text-sm">{p.desc}</p>
            </div>
            <p className="font-mono text-xs text-[var(--crimson)] flex-shrink-0">{p.price}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="border border-[var(--border)] p-8 bg-[var(--surface)]">
        <h2 className="heading-editorial text-2xl text-[var(--white)] mb-2">
          Get in touch
        </h2>
        <p className="text-[var(--ash)] text-sm mb-6">
          Send us an email and we&apos;ll get back to you with rates, traffic data, and available placements.
        </p>
        <a
          href="mailto:ads@inkognito.app"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
        >
          Email us → ads@inkognito.app
        </a>
        <p className="text-[var(--muted)] text-[10px] font-mono mt-4 uppercase tracking-widest">
          We respond within 24 hours · No adult/illegal product ads accepted
        </p>
      </div>
    </div>
  );
}
