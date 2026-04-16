/**
 * Privacy Policy — app/privacy/page.tsx
 * Required for AdSense approval and NDPR (Nigerian Data Protection Regulation) compliance.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Inkognito handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container-ink py-16 max-w-2xl">
      <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-4">
        Legal
      </p>
      <h1 className="heading-editorial text-4xl text-[var(--white)] mb-10">
        Privacy Policy
      </h1>

      <div className="space-y-8 text-[var(--ash)] text-sm leading-relaxed">
        <Section title="Our Approach">
          Inkognito is built for anonymity. We collect the minimum data necessary to run the platform and prevent abuse. We do not sell your data. We do not collect your name or email.
        </Section>

        <Section title="What We Collect">
          <ul className="space-y-2 mt-2">
            {[
              { item: "Session UUID", desc: "Generated in your browser, stored in localStorage. Used to associate your posts and reactions. Not linked to your identity." },
              { item: "Approximate location", desc: "Country and city derived from your IP address via ipapi.co. Used to show location on confessions (e.g., 'Anon · Lagos, NG'). We do not store your full IP address." },
              { item: "Device fingerprint (coarse)", desc: "A hashed combination of your browser platform, language, and screen size. Used only for abuse detection and rate limiting." },
              { item: "Content you post", desc: "Confessions, comments, and reactions. These are stored anonymously linked to your session UUID." },
            ].map(({ item, desc }) => (
              <li key={item} className="flex gap-3">
                <span className="text-[var(--crimson)] flex-shrink-0 mt-0.5">—</span>
                <div>
                  <span className="text-[var(--white)] font-medium">{item}:</span>{" "}
                  {desc}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="What We Do NOT Collect">
          <ul className="mt-2 space-y-1.5 ml-4">
            {[
              "Name or username (unless you optionally create one)",
              "Email address",
              "Phone number",
              "Full IP address (only country/city via third-party lookup)",
              "Video or audio from chat sessions (peer-to-peer, we never see it)",
              "AI companion messages (session-only, never stored in our database)",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--muted)]">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Third-Party Services">
          <ul className="mt-2 space-y-2">
            {[
              { name: "Convex", purpose: "Database and real-time backend. Data stored in the US.", link: "https://www.convex.dev/privacy" },
              { name: "Groq", purpose: "AI companion inference. Messages sent to Groq for processing (not stored by us).", link: "https://groq.com/privacy-policy/" },
              { name: "ipapi.co", purpose: "IP-to-location lookup. Your IP is sent to ipapi.co momentarily to determine country/city.", link: "https://ipapi.co/privacy/" },
              { name: "Google AdSense", purpose: "Advertising. Google may set cookies and collect data per their privacy policy.", link: "https://policies.google.com/privacy" },
              { name: "AWS Rekognition", purpose: "Image moderation. Uploaded images may be sent to AWS for content analysis.", link: "https://aws.amazon.com/privacy/" },
            ].map(({ name, purpose, link }) => (
              <li key={name} className="flex gap-3">
                <span className="text-[var(--crimson)] flex-shrink-0 mt-0.5">—</span>
                <div>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-[var(--white)] hover:text-[var(--crimson)] transition-colors">{name}</a>
                  {": "}{purpose}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Cookies">
          We use localStorage (not traditional cookies) to store your session UUID and age confirmation. Google AdSense may set cookies for ad personalization. You can opt out of ad personalization via Google's ad settings.
        </Section>

        <Section title="Data Retention">
          Confessions and comments are retained indefinitely unless removed by moderation or your request. Session UUIDs persist until you clear your browser's localStorage. There is no account deletion flow currently — contact us to request data removal.
        </Section>

        <Section title="Your Rights (NDPR / GDPR)">
          You have the right to: access data associated with your session UUID, request deletion of your content, and opt out of location collection (simply block the ipapi.co request in your browser). Contact us at privacy@inkognito.app.
        </Section>

        <Section title="Children">
          Inkognito is strictly for users 18 and older. We do not knowingly collect data from minors. If you believe a minor has accessed the platform, contact us immediately.
        </Section>

        <div className="border-t border-[var(--border)] pt-6">
          <p className="text-[var(--muted)] text-xs font-mono">
            Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
            {" · "}
            <a href="mailto:privacy@inkognito.app" className="text-[var(--crimson)] hover:underline">privacy@inkognito.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-bold text-[var(--white)] text-lg mb-3">{title}</h2>
      <div>{children}</div>
    </div>
  );
}
