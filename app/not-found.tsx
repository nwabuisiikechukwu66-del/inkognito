/**
 * 404 Not Found — app/not-found.tsx
 * Custom 404 page. Dark, minimal, on-brand.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-ink py-32 text-center">
      <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-6">
        404
      </p>
      <h1 className="heading-editorial text-5xl text-[var(--white)] mb-4">
        This page
        <br />
        <em className="text-[var(--ash)]">doesn&apos;t exist.</em>
      </h1>
      <p className="text-[var(--dim)] text-sm font-mono uppercase tracking-widest mb-10">
        Like most things here.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--ash)] font-mono text-xs uppercase tracking-widest hover:border-[var(--muted)] hover:text-[var(--white)] transition-all"
      >
        ← Back to the feed
      </Link>
    </div>
  );
}
