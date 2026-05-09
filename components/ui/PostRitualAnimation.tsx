/**
 * PostRitualAnimation — components/ui/PostRitualAnimation.tsx
 *
 * "Release into the Void" — cinematic animation when a confession is posted.
 * Full-screen overlay with ink dissolve effect + ripple wave.
 * ~2.5s duration, auto-dismisses.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PostRitualAnimationProps {
  /** Whether to show the animation */
  isActive: boolean;
  /** Called when animation completes */
  onComplete: () => void;
  /** The mood color accent */
  moodColor?: string;
}

export function PostRitualAnimation({
  isActive,
  onComplete,
  moodColor = "#c41e3a",
}: PostRitualAnimationProps) {
  const [phase, setPhase] = useState<"dissolve" | "ripple" | "fade">("dissolve");

  useEffect(() => {
    if (!isActive) {
      setPhase("dissolve");
      return;
    }

    const t1 = setTimeout(() => setPhase("ripple"), 800);
    const t2 = setTimeout(() => setPhase("fade"), 1800);
    const t3 = setTimeout(() => {
      setPhase("dissolve");
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#050505]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
          />

          {/* Ripple rings */}
          {phase !== "dissolve" && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border"
                  style={{ borderColor: moodColor }}
                  initial={{ width: 0, height: 0, opacity: 0.6 }}
                  animate={{
                    width: [0, 600 + i * 200],
                    height: [0, 600 + i * 200],
                    opacity: [0.4, 0],
                    borderWidth: [2, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.15,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {/* Ink drops falling */}
          {phase === "dissolve" && (
            <div className="absolute inset-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${moodColor}40, transparent)`,
                    left: `${10 + Math.random() * 80}%`,
                    top: `${20 + Math.random() * 30}%`,
                    width: `${8 + Math.random() * 16}px`,
                    height: `${8 + Math.random() * 16}px`,
                  }}
                  initial={{ opacity: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    y: [0, 100 + Math.random() * 200],
                    scale: [1, 0.3],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.06,
                    ease: "easeIn",
                  }}
                />
              ))}
            </div>
          )}

          {/* Center text */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: phase === "fade" ? 0 : 1,
              scale: phase === "ripple" ? 1.05 : 1,
            }}
            transition={{ duration: 0.5 }}
          >
            <motion.p
              className="font-display font-bold text-3xl md:text-4xl italic mb-3"
              style={{ color: moodColor }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Released.
            </motion.p>
            <motion.p
              className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-[0.4em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              your words have entered the void
            </motion.p>
          </motion.div>

          {/* Floating particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`p-${i}`}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: moodColor,
                left: `${Math.random() * 100}%`,
                bottom: "50%",
              }}
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [0, -(100 + Math.random() * 300)],
                x: (Math.random() - 0.5) * 100,
              }}
              transition={{
                duration: 2,
                delay: 0.3 + i * 0.08,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
