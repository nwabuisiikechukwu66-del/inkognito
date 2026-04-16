/**
 * Terms of Service — app/terms/page.tsx
 * Required for AdSense approval and general legal compliance.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Inkognito Terms of Service.",
};

export default function TermsPage() {
  return (
    <div className="container-ink py-16 max-w-2xl">
      <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-4">
        Legal
      </p>
      <h1 className="heading-editorial text-4xl text-[var(--white)] mb-10">
        Terms of Service
      </h1>

      <div className="space-y-8 text-[var(--ash)] text-sm leading-relaxed">
        <Section title="1. Age Requirement">
          You must be at least 18 years old to use Inkognito. By accessing the platform, you confirm you meet this requirement. We may terminate access for users who violate this rule.
        </Section>

        <Section title="2. Anonymous Use">
          Inkognito is designed for anonymous use. We collect minimal data: a session UUID, approximate location (country/city via IP), and a coarse device fingerprint for abuse prevention. We do not collect names, email addresses, or phone numbers.
        </Section>

        <Section title="3. Prohibited Content">
          The following content is strictly prohibited and will result in immediate removal and a permanent ban:
          <ul className="mt-3 space-y-1.5 ml-4">
            {[
              "Child sexual abuse material (CSAM) or any sexual content involving minors",
              "Non-consensual intimate imagery",
              "Doxxing or sharing personal information of real people without consent",
              "Direct threats of violence against specific individuals",
              "Content designed to harass or stalk a specific person",
              "Spam, malware, phishing links",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[var(--crimson)] flex-shrink-0">—</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Content You Post">
          You are solely responsible for content you post. By posting, you confirm the content does not violate these terms or applicable law. We reserve the right to remove any content at our discretion.
        </Section>

        <Section title="5. Moderation">
          We employ automated and manual moderation. You can report content using the flag button on any confession. We aim to review reports within 24-48 hours.
        </Section>

        <Section title="6. AI Companion">
          The AI companion is provided for informational and emotional support purposes only. It is not a licensed therapist, counselor, or medical professional. Do not rely on it for medical, legal, or crisis decisions. If you are in crisis, please contact a qualified professional.
        </Section>

        <Section title="7. Video & Chat">
          Video chat is peer-to-peer (WebRTC). We do not record, store, or monitor video or audio streams. We are not responsible for content exchanged between users in chat sessions.
        </Section>

        <Section title="8. Advertising">
          Inkognito uses Google AdSense and may display third-party advertisements. We are not responsible for the content of third-party ads.
        </Section>

        <Section title="9. Disclaimers">
          Inkognito is provided "as is" without warranties of any kind. We are not liable for user-generated content, interruptions in service, or any damages arising from use of the platform.
        </Section>

        <Section title="10. Changes">
          We may update these terms at any time. Continued use of the platform constitutes acceptance of the updated terms.
        </Section>

        <div className="border-t border-[var(--border)] pt-6">
          <p className="text-[var(--muted)] text-xs font-mono">
            Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
            {" · "}Contact: <a href="mailto:legal@inkognito.app" className="text-[var(--crimson)] hover:underline">legal@inkognito.app</a>
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
