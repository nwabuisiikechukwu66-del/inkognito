/**
 * Companion Page — app/companion/page.tsx
 *
 * AI companion powered by Groq (Llama 3).
 * Non-judgmental, warm, therapeutic tone.
 * Persistent within session, resets on reload (intentional).
 */

import type { Metadata } from "next";
import { CompanionChat } from "@/components/companion/CompanionChat";

export const metadata: Metadata = {
  title: "Companion",
  description:
    "An AI that listens without judgment. Talk freely. Stay anonymous.",
};

export default function CompanionPage() {
  return (
    <div className="container-ink py-10">
      {/* Page heading */}
      <div className="mb-8">
        <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-3">
          ai companion
        </p>
        <h1 className="heading-editorial text-4xl text-[var(--white)] mb-3">
          It listens.
          <br />
          <em>Without judgment.</em>
        </h1>
        <p className="text-[var(--ash)] text-sm max-w-md">
          Tell it anything. It won&apos;t remember tomorrow. Neither will you
          — but for now, it&apos;s just you and it.
        </p>
      </div>

      {/* Companion chat interface */}
      <CompanionChat />
    </div>
  );
}
