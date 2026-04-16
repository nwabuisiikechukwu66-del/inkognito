/**
 * Footer — components/layout/Footer.tsx
 *
 * Minimal dark footer.
 * Links: Terms, Privacy, Advertise, Admin (hidden).
 * Required for AdSense (must have Privacy Policy + Terms links).
 */

import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] mt-20">
      <div className="container-ink py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--crimson)] block" />
          <span className="font-display font-bold text-sm text-[var(--ash)]">
            Inkognito
          </span>
          <span className="text-[var(--muted)] text-xs font-mono ml-2">
            © {year}
          </span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6">
          {[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/advertise", label: "Advertise" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest hover:text-[var(--ash)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Tagline */}
        <p className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest">
          No names. No traces.
        </p>
      </div>
    </footer>
  );
}
