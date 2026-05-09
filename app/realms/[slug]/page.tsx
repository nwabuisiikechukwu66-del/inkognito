/**
 * Individual Realm Page — app/realms/[slug]/page.tsx
 *
 * Shows a specific realm with its header, rules, and filtered confession feed.
 * Dynamic route based on realm slug.
 */

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { RealmHeader } from "@/components/realms/RealmHeader";
import { ConfessionCard } from "@/components/feed/ConfessionCard";
import { ConfessionSkeleton } from "@/components/feed/ConfessionSkeleton";
import { useState } from "react";
import { clsx } from "clsx";
import { Flame, Clock, PenSquare } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RealmPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { sessionId } = useAnonSession();
  const [sortBy, setSortBy] = useState<"recent" | "hot">("recent");

  const realm = useQuery(api.realms.getBySlug, {
    slug,
    sessionId: sessionId || undefined,
  });

  const feedData = useQuery(
    api.confessions.getFeed,
    realm
      ? {
          sortBy,
          limit: 50,
          sessionId: sessionId || undefined,
          realmId: realm._id,
        }
      : "skip"
  );

  // Loading state
  if (realm === undefined) {
    return (
      <div className="min-h-screen">
        <div className="h-[280px] bg-[var(--surface)] animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ConfessionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (realm === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-5xl italic text-[var(--muted)] mb-4">
            Lost in the Void.
          </p>
          <p className="text-[var(--dim)] text-sm font-mono uppercase tracking-widest mb-8">
            This realm does not exist.
          </p>
          <Link
            href="/realms"
            className="px-6 py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
          >
            Browse All Realms
          </Link>
        </div>
      </div>
    );
  }

  const confessions = feedData?.confessions ?? [];
  const isLoading = feedData === undefined;

  return (
    <div className="min-h-screen">
      {/* Realm Header */}
      <RealmHeader realm={realm} />

      {/* Feed Controls + Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 border border-[var(--border)] p-0.5">
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

          {/* Confess in realm CTA */}
          <Link
            href={`/confess?realm=${slug}`}
            className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all text-[var(--white)] hover:brightness-110"
            style={{ background: realm.themeColor }}
          >
            <PenSquare size={12} />
            Confess Here
          </Link>
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <ConfessionSkeleton key={i} />
            ))}
          </div>
        ) : confessions.length === 0 ? (
          <div className="py-20 text-center border border-[var(--border)] border-dashed bg-[var(--surface)]/30">
            <p className="font-display text-3xl italic text-[var(--muted)] mb-3">
              Silence.
            </p>
            <p className="text-[var(--dim)] text-sm font-mono uppercase tracking-widest mb-8">
              This realm awaits its first confession.
            </p>
            <Link
              href={`/confess?realm=${slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest text-[var(--white)] hover:brightness-110 transition-all"
              style={{ background: realm.themeColor }}
            >
              <PenSquare size={14} />
              Be the First to Speak
            </Link>
          </div>
        ) : (
          <motion.div
            className="space-y-px"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {confessions.map((confession) => (
              <motion.div
                key={confession._id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
              >
                <ConfessionCard confession={confession} />
              </motion.div>
            ))}

            <div className="py-12 text-center">
              <p className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-[0.3em]">
                End of realm feed.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
