/**
 * Navbar — components/layout/Navbar.tsx
 *
 * Top navigation bar.
 * - Wordmark left
 * - Nav links center (Feed, Confess, Chat, Companion)
 * - Session indicator right (anonymous badge or username)
 *
 * Sticky, minimal, dark. No hamburger menu — clean desktop + mobile.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "Feed" },
  { href: "/confess", label: "Confess" },
  { href: "/chat", label: "Stranger" },
  { href: "/companion", label: "Companion" },
];

export function Navbar() {
  const pathname = usePathname();
  const { country, isLoaded } = useAnonSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[var(--border)]"
        style={{ background: "rgba(10,10,11,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="container-ink h-14 flex items-center justify-between">

          {/* ── Wordmark ────────────────────────────────────── */}
          <Link href="/" className="group flex items-center gap-2">
            {/* Crimson dot */}
            <span className="w-2 h-2 bg-[var(--crimson)] block animate-pulse-red" />
            <span className="font-display font-bold text-lg tracking-tight text-[var(--white)] group-hover:text-[var(--paper)] transition-colors">
              Inkognito
            </span>
          </Link>

          {/* ── Desktop Nav ─────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-4 py-1.5 font-mono text-xs tracking-widest uppercase transition-all duration-200",
                    active
                      ? "text-[var(--white)] border-b border-[var(--crimson)]"
                      : "text-[var(--dim)] hover:text-[var(--ash)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right side: anonymous badge + mobile toggle ── */}
          <div className="flex items-center gap-4">
            {/* Location / anon badge */}
            {isLoaded && (
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)]" />
                {country ? `anon · ${country}` : "anon"}
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Nav Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-0 right-0 z-40 border-b border-[var(--border)] md:hidden"
            style={{ background: "rgba(10,10,11,0.98)", backdropFilter: "blur(20px)" }}
          >
            <nav className="container-ink py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      "py-3 px-2 font-mono text-xs tracking-widest uppercase border-b border-[var(--border)] last:border-0 transition-colors",
                      active ? "text-[var(--white)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
                    )}
                  >
                    {active && <span className="text-[var(--crimson)] mr-2">›</span>}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
