/**
 * Confess Page — app/confess/page.tsx
 *
 * The confession writing room.
 * Dark, intimate, focused — like writing in a journal at 3am.
 * Full access without sign-up.
 */

import type { Metadata } from "next";
import { ConfessForm } from "@/components/feed/ConfessForm";

export const metadata: Metadata = {
  title: "Confess",
  description: "Drop your confession. No name. No trace. Just the truth.",
};

export default function ConfessPage() {
  return (
    <div className="container-ink py-16">
      {/* Page heading */}
      <div className="feed-width mx-auto mb-10">
        <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-3">
          confession room
        </p>
        <h1 className="heading-editorial text-4xl md:text-5xl text-[var(--white)] mb-4">
          Say what you&apos;ve never
          <br />
          <em>said out loud.</em>
        </h1>
        <p className="text-[var(--ash)] text-sm leading-relaxed max-w-md">
          No name. No trace. Your words, stripped bare. Once it&apos;s out,
          it&apos;s out — and the world might just feel lighter.
        </p>
      </div>

      {/* Confession form */}
      <ConfessForm />
    </div>
  );
}
