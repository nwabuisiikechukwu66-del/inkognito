/**
 * FeedPage — components/feed/FeedPage.tsx
 *
 * Main confession feed.
 * - Category filter tabs
 * - Sort toggle (Recent / Hot)
 * - Infinite scroll via "Load more" (simpler than IntersectionObserver for now)
 * - Real-time updates via Convex useQuery
 * - Skeleton loading states
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { ConfessionCard } from "./ConfessionCard";
import { ConfessionSkeleton } from "./ConfessionSkeleton";
import { clsx } from "clsx";
import { Flame, Clock, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

/* ── FeedPage Component ────────────────────────────────────────── */

export function FeedPage() {
  const { sessionId } = useAnonSession();
  const [sortBy, setSortBy] = useState("random");
  const [category, setCategory] = useState("all");

  // Fetch feed from Convex — auto-updates in real time
  const result = useQuery(api.confessions.getFeed, {
    sortBy,
    category,
    limit: 200,
    sessionId: sessionId || undefined,
  });

  const isLoading = result === undefined;
  const confessions = result?.confessions ?? [];

  const handleRefresh = useCallback(() => {
    // Convex auto-refreshes, but this triggers a visual reset
    setSortBy((s) => s === "random" ? "recent" : "random");
  }, []);

  return (
    <div className="container-ink py-10">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main Feed Column ─────────────────────────────── */}
        <div className="feed-width w-full mx-auto lg:mx-0">

          {/* Controls bar */}
          <div className="flex items-center justify-between mb-6">
            {/* Sort toggle */}
            <div className="flex items-center gap-1 border border-[var(--border)] p-0.5">
              <button
                onClick={() => setSortBy("random")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                  sortBy === "random"
                    ? "bg-[var(--surface)] text-[var(--white)]"
                    : "text-[var(--dim)] hover:text-[var(--ash)]"
                )}
              >
                <RefreshCw size={11} className={sortBy === "random" ? "animate-spin-slow" : ""} />
                Shuffle
              </button>
              <button
                onClick={() => setSortBy("recent")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                  sortBy === "recent"
                    ? "bg-[var(--surface)] text-[var(--white)]"
                    : "text-[var(--dim)] hover:text-[var(--ash)]"
                )}
              >
                <Clock size={11} />
                Recent
              </button>
              <button
                onClick={() => setSortBy("hot")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all",
                  sortBy === "hot"
                    ? "bg-[var(--surface)] text-[var(--white)]"
                    : "text-[var(--dim)] hover:text-[var(--ash)]"
                )}
              >
                <Flame size={11} />
                Hot
              </button>
            </div>

            {/* Live indicator + refresh */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--crimson)] animate-pulse-red" />
                Live
              </span>
              <button
                onClick={handleRefresh}
                className="text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
                aria-label="Refresh feed"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Feed list */}
          {isLoading ? (
            /* Skeleton loading */
            <div className="space-y-px">
              {Array.from({ length: 6 }).map((_, i) => (
                <ConfessionSkeleton key={i} />
              ))}
            </div>
          ) : confessions.length === 0 ? (
            /* Empty state */
            <EmptyFeed />
          ) : (
            <motion.div
              className="space-y-px"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {confessions.map((confession, i) => (
                <motion.div
                  key={confession._id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  {/* Inject ad every 8 confessions */}
                  {i > 0 && i % 8 === 0 && <AdSlot />}
                  <ConfessionCard confession={confession} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <FeedSidebar />
        </aside>
      </div>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────── */
function EmptyFeed() {
  return (
    <div className="py-20 text-center border border-[var(--border)] border-dashed bg-[var(--surface)]/30 rounded-xl px-6">
      <div className="font-display text-5xl italic text-[var(--muted)] mb-4">
        Silence.
      </div>
      <p className="text-[var(--dim)] text-sm font-mono uppercase tracking-[0.2em] mb-8">
        No confessions found in this void.
      </p>
      <Link 
        href="/confess"
        className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-[11px] uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-all"
      >
        Be the First to Speak
      </Link>
    </div>
  );
}

/* ── Ad Slot ───────────────────────────────────────────────── */
/**
 * AdSlot — placeholder for Google AdSense banner.
 * Replace the inner div with your AdSense <ins> tag.
 * Styled to blend with the dark theme, not scream "advertisement".
 */
function AdSlot() {
  return (
    <div className="my-4 border border-[var(--border)] border-dashed p-4">
      <div className="text-center">
        <p className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-widest mb-2">
          Advertisement
        </p>
        {/*
          REPLACE THIS COMMENT WITH YOUR GOOGLE ADSENSE TAG:

          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
            data-ad-slot="XXXXXXXXXX"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />

          Then add this script in app/layout.tsx <head>:
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXX" crossOrigin="anonymous" />
        */}
        <div
          className="w-full h-[90px] bg-[var(--surface)] flex items-center justify-center"
          aria-hidden
        >
          <span className="text-[var(--muted)] text-[10px] font-mono">728×90 banner</span>
        </div>
      </div>
    </div>
  );
}

/* ── Feed Sidebar ──────────────────────────────────────────── */
function FeedSidebar() {
  return (
    <div className="space-y-6 sticky top-20">
      {/* About card */}
      <div className="border border-[var(--border)] p-5 bg-[var(--surface)]">
        <h3 className="font-display font-bold text-[var(--white)] mb-2">
          What is Inkognito?
        </h3>
        <p className="text-[var(--ash)] text-xs leading-relaxed">
          A place where secrets live. Post anonymously, connect with
          strangers, or just read. No account needed. No traces left.
        </p>
      </div>

      {/* Quick actions */}
      <div className="border border-[var(--border)] p-5 bg-[var(--surface)] space-y-2">
        <p className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest mb-3">
          Quick access
        </p>
        {[
          { href: "/confess", label: "Post a confession" },
          { href: "/chat", label: "Talk to a stranger" },
          { href: "/companion", label: "AI companion" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 text-[var(--ash)] text-sm hover:text-[var(--white)] transition-colors group"
          >
            <span>{item.label}</span>
            <span className="text-[var(--crimson)] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </a>
        ))}
      </div>

      {/* Sidebar ad slot */}
      <div className="border border-[var(--border)] border-dashed p-3">
        <p className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-widest mb-2 text-center">
          Advertisement
        </p>
        <div className="w-full h-[250px] bg-[var(--surface)] flex items-center justify-center">
          <span className="text-[var(--muted)] text-[10px] font-mono">300×250</span>
        </div>
      </div>
    </div>
  );
}
