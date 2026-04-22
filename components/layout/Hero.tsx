/**
 * Hero — components/layout/Hero.tsx
 *
 * Compact editorial hero — sets the tone, gets out of the way fast.
 * Dark, typographic, slightly unsettling in the best way.
 * Animated on mount with staggered reveals.
 */

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/* Stagger animation helper */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
});

export function Hero() {
  return (
    <section className="relative border-b border-[var(--border)] overflow-hidden">
      {/* Decorative horizontal rule lines — editorial page layout feel */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Vertical red line, far left */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--crimson)] opacity-20" />
        {/* Diagonal line */}
        <div
          className="absolute opacity-[0.04]"
          style={{
            top: 0,
            right: "15%",
            width: "1px",
            height: "200%",
            background: "var(--paper)",
            transform: "rotate(-12deg)",
            transformOrigin: "top",
          }}
        />
        {/* Large ghost text */}
        <div
          className="absolute right-[-2rem] top-1/2 -translate-y-1/2 font-display font-black text-[12vw] text-[var(--surface)] select-none leading-none uppercase opacity-60"
          aria-hidden
        >
          ANON
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24 relative">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.p
            {...fadeUp(0)}
            className="font-mono text-[11px] text-[var(--crimson)] tracking-[0.25em] uppercase mb-5"
          >
            speak without a face
          </motion.p>

          {/* Main headline — editorial, Playfair Display */}
          <h1
            className="heading-editorial text-[clamp(2.5rem,6vw,4.5rem)] text-[var(--white)] mb-6 leading-[1.05]"
          >
            Every secret
            <br />
            <em className="text-[var(--paper)]">deserves an audience.</em>
          </h1>

          {/* Subtext */}
          <motion.p
            {...fadeUp(0.2)}
            className="text-[var(--ash)] text-base leading-relaxed max-w-lg mb-10"
          >
            Anonymous confessions. Random strangers. An AI that never judges.
            <br />
            No account. No trace. Just you and the dark.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-3">
            <Link
              href="/confess"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors duration-200"
            >
              Confess now
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--ash)] font-mono text-xs uppercase tracking-widest hover:border-[var(--muted)] hover:text-[var(--paper)] transition-all duration-200"
            >
              Find a stranger
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom ticker — scrolling categories */}
      <Ticker />
    </section>
  );
}

/** Scrolling ticker strip — like a news ticker, shows confession categories */
function Ticker() {
  const items = [
    "sexual confessions",
    "dark thoughts",
    "relationship secrets",
    "work confessions",
    "family truths",
    "what i never said",
    "late night thoughts",
    "guilty pleasures",
    "things i did",
    "what i wanted",
  ];

  // Duplicate for seamless loop
  const all = [...items, ...items];

  return (
    <div
      className="border-t border-[var(--border)] overflow-hidden py-2"
      style={{ background: "var(--deep)" }}
    >
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {all.map((item, i) => (
          <span
            key={i}
            className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-[0.2em] flex-shrink-0"
          >
            {item}
            <span className="ml-8 text-[var(--muted)]">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
