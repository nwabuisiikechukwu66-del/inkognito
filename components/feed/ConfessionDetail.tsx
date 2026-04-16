/**
 * ConfessionDetail — components/feed/ConfessionDetail.tsx
 *
 * Full single-confession view rendered on /c/[id].
 * Shown when a shared link is opened.
 *
 * Features:
 * - Full text (no truncation)
 * - Reactions
 * - Comments
 * - Social share sheet (Twitter, WhatsApp, Telegram, Copy)
 * - Back to feed link
 */

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConfessionCard } from "./ConfessionCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { shareToTwitter, shareToWhatsApp, shareTelegram, copyToClipboard } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  id: string;
}

export function ConfessionDetail({ id }: Props) {
  const confession = useQuery(api.confessions.getById, {
    id: id as Id<"confessions">,
  });

  if (confession === undefined) {
    // Loading
    return (
      <div className="feed-width mx-auto">
        <div className="skeleton h-64 w-full rounded-none" />
      </div>
    );
  }

  if (!confession) {
    return (
      <div className="feed-width mx-auto text-center py-20">
        <p className="heading-editorial text-3xl text-[var(--muted)] italic mb-4">
          Gone.
        </p>
        <p className="text-[var(--dim)] text-sm font-mono uppercase tracking-widest">
          This confession no longer exists.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 font-mono text-xs text-[var(--crimson)] uppercase tracking-widest hover:text-[var(--crimson-bright)] transition-colors"
        >
          <ArrowLeft size={12} />
          Back to feed
        </Link>
      </div>
    );
  }

  const url = typeof window !== "undefined" ? window.location.href : "";

  function handleCopy() {
    copyToClipboard(url).then(() => toast.success("Link copied."));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="feed-width mx-auto"
    >
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-mono text-xs text-[var(--dim)] uppercase tracking-widest hover:text-[var(--ash)] transition-colors mb-6"
      >
        <ArrowLeft size={12} />
        All confessions
      </Link>

      {/* The confession card (full, not truncated) */}
      <ConfessionCard confession={confession as any} />

      {/* Share sheet */}
      <div className="mt-6 border border-[var(--border)] p-5 bg-[var(--surface)]">
        <p className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest mb-4">
          Share this confession
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Twitter / X",
              action: () => shareToTwitter(url, confession.content),
            },
            {
              label: "WhatsApp",
              action: () => shareToWhatsApp(url, confession.content),
            },
            {
              label: "Telegram",
              action: () => shareTelegram(url, confession.content),
            },
            { label: "Copy link", action: handleCopy },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="px-4 py-2 border border-[var(--border)] font-mono text-[10px] text-[var(--ash)] uppercase tracking-widest hover:border-[var(--muted)] hover:text-[var(--white)] transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[var(--muted)] text-[10px] font-mono mt-3">
          Sharing shows only a snippet — the full confession is behind the link.
        </p>
      </div>
    </motion.div>
  );
}
