/**
 * AgeGate — components/ui/AgeGate.tsx
 *
 * 18+ verification overlay.
 * Shown once per browser — persists in localStorage.
 *
 * Design: Full-screen overlay, dark editorial.
 * Simple "I am 18+" CTA — no complex flow needed.
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already confirmed age
    const confirmed = localStorage.getItem("ink_age_confirmed");
    if (!confirmed) {
      setShow(true);
    }
  }, []);

  function confirm() {
    localStorage.setItem("ink_age_confirmed", "1");
    setShow(false);
  }

  function deny() {
    // Redirect away
    window.location.href = "https://google.com";
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: "rgba(10,10,11,0.98)", backdropFilter: "blur(20px)" }}
        >
          {/* Decorative background lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 40px, #E8E0D5 40px, #E8E0D5 41px)",
              }}
            />
          </div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative text-center max-w-sm mx-6"
          >
            {/* Wordmark */}
            <div className="font-display text-3xl font-bold tracking-tight text-[var(--white)] mb-1">
              Inkognito
            </div>

            {/* Age notice */}
            <div className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-8">
              18+ only
            </div>

            <p className="text-[var(--ash)] text-sm leading-relaxed mb-10">
              This platform contains adult content, explicit confessions, and
              mature themes. You must be at least 18 years old to enter.
            </p>

            {/* Confirm button */}
            <button
              onClick={confirm}
              className="w-full py-4 bg-[var(--crimson)] text-[var(--white)] font-display font-bold tracking-wide text-sm uppercase mb-3 hover:bg-[var(--crimson-bright)] transition-colors duration-200"
            >
              I am 18 or older — Enter
            </button>

            {/* Deny */}
            <button
              onClick={deny}
              className="w-full py-3 text-[var(--dim)] text-xs font-mono uppercase tracking-widest hover:text-[var(--ash)] transition-colors duration-200"
            >
              I am under 18 — Leave
            </button>

            {/* Fine print */}
            <p className="text-[var(--dim)] text-[10px] mt-8 leading-relaxed">
              By entering, you confirm you are 18+ and agree to our terms.
              We use cookies to remember your preference.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
