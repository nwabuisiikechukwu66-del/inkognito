/**
 * ConfessForm — components/feed/ConfessForm.tsx
 *
 * The confession writing interface.
 * Dark, focused, intimate — like a private journal entry.
 *
 * Features:
 * - Text area with character count
 * - Category selector
 * - NSFW toggle
 * - Submit (no account needed)
 * - Success state with share prompt
 */

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Check } from "lucide-react";

const CATEGORIES = [
  { value: "sexual",       label: "Sexual"        },
  { value: "relationship", label: "Relationship"  },
  { value: "dark",         label: "Dark thought"  },
  { value: "work",         label: "Work"          },
  { value: "family",       label: "Family"        },
  { value: "funny",        label: "Funny"         },
  { value: "other",        label: "Other"         },
];

const MAX_CHARS = 2000;

export function ConfessForm() {
  const { sessionId, country, city, isLoaded } = useAnonSession();

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [isNSFW, setIsNSFW] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [postedId, setPostedId] = useState<string | null>(null);

  const postMutation = useMutation(api.confessions.post);

  const charCount = content.length;
  const remaining = MAX_CHARS - charCount;
  const isNearLimit = remaining < 200;
  const isOverLimit = remaining < 0;

  async function handleSubmit() {
    if (!sessionId || !content.trim() || isOverLimit) return;

    setSubmitting(true);
    try {
      const { id } = await postMutation({
        sessionId,
        content: content.trim(),
        category,
        isNSFW,
        country: country ?? undefined,
        city: city ?? undefined,
      });

      setPostedId(id);
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnother() {
    setContent("");
    setCategory("other");
    setIsNSFW(false);
    setSubmitted(false);
    setPostedId(null);
  }

  function handleShare() {
    if (!postedId) return;
    const url = `${window.location.origin}/?c=${postedId}`;
    if (navigator.share) {
      navigator.share({ title: "My confession on Inkognito", url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    }
  }

  /* ── Success state ───────────────────────────────────────── */
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="feed-width mx-auto border border-[var(--border)] p-10 text-center bg-[var(--surface)]"
      >
        <div className="w-12 h-12 border border-[var(--crimson)] flex items-center justify-center mx-auto mb-6">
          <Check size={20} className="text-[var(--crimson)]" />
        </div>
        <h2 className="heading-editorial text-2xl text-[var(--white)] mb-3">
          It&apos;s out there now.
        </h2>
        <p className="text-[var(--ash)] text-sm mb-8">
          Your confession is live. Anonymous. Permanent. Free.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleShare}
            className="px-5 py-2.5 border border-[var(--border)] text-[var(--ash)] font-mono text-[10px] uppercase tracking-widest hover:border-[var(--muted)] hover:text-[var(--white)] transition-all"
          >
            Share it
          </button>
          <button
            onClick={handleAnother}
            className="px-5 py-2.5 bg-[var(--crimson)] text-[var(--white)] font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
          >
            Confess again
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Form ────────────────────────────────────────────────── */
  return (
    <div className="feed-width mx-auto">
      <div className="border border-[var(--border)] bg-[var(--surface)]">
        {/* Text area */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing. No one will know it was you."
            rows={10}
            className={clsx(
              "w-full p-6 bg-transparent text-[var(--paper)] placeholder:text-[var(--muted)] text-base leading-relaxed resize-none border-b border-[var(--border)] focus:outline-none font-body",
              isOverLimit && "text-[var(--crimson)]"
            )}
          />

          {/* Character count */}
          <div
            className={clsx(
              "absolute bottom-3 right-4 font-mono text-[10px]",
              isOverLimit
                ? "text-[var(--crimson)]"
                : isNearLimit
                ? "text-[#F59E0B]"
                : "text-[var(--muted)]"
            )}
          >
            {remaining}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Category picker */}
          <div className="flex flex-wrap gap-2 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={clsx(
                  "px-3 py-1 font-mono text-[10px] uppercase tracking-widest border transition-all duration-150",
                  category === cat.value
                    ? "border-[var(--crimson)] text-[var(--crimson)] bg-[var(--crimson-dim)]"
                    : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--muted)] hover:text-[var(--ash)]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* NSFW toggle + Submit */}
          <div className="flex items-center gap-4 ml-auto">
            {/* NSFW toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => setIsNSFW((v) => !v)}
                className={clsx(
                  "w-8 h-4 border transition-all relative",
                  isNSFW
                    ? "border-[var(--crimson)] bg-[var(--crimson-dim)]"
                    : "border-[var(--border)]"
                )}
              >
                <div
                  className={clsx(
                    "absolute top-0.5 w-3 h-3 transition-all",
                    isNSFW
                      ? "left-4 bg-[var(--crimson)]"
                      : "left-0.5 bg-[var(--dim)]"
                  )}
                />
              </div>
              <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest group-hover:text-[var(--ash)] transition-colors">
                NSFW
              </span>
            </label>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={
                submitting || !content.trim() || isOverLimit || !isLoaded
              }
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                submitting || !content.trim() || isOverLimit
                  ? "bg-[var(--muted)] text-[var(--dim)] cursor-not-allowed"
                  : "bg-[var(--crimson)] text-[var(--white)] hover:bg-[var(--crimson-bright)]"
              )}
            >
              {submitting ? (
                "Posting..."
              ) : (
                <>
                  <Send size={11} />
                  Confess
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Anonymous assurance */}
      <p className="text-[var(--muted)] font-mono text-[10px] text-center mt-4 uppercase tracking-widest">
        Completely anonymous · No account required ·
        {country && ` Posting from ${country}`}
      </p>
    </div>
  );
}
