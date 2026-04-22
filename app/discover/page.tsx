"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { ConfessionCard } from "@/components/feed/ConfessionCard";
import { Compass, Zap, Clock, Filter } from "lucide-react";
import { clsx } from "clsx";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "relationship", label: "Romance" },
  { id: "sexual", label: "Adult" },
  { id: "dark", label: "Dark" },
  { id: "work", label: "Work" },
  { id: "family", label: "Family" },
  { id: "funny", label: "Funny" },
  { id: "other", label: "Other" },
];

export default function DiscoverPage() {
  const { sessionId } = useAnonSession();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "hot">("hot");

  const feedData = useQuery(api.confessions.getFeed, {
    category: selectedCategory,
    sortBy: sortBy,
    limit: 30,
    sessionId: sessionId || undefined,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <p className="font-mono text-[11px] md:text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-4">
            Exploration
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[var(--white)] flex items-center gap-3">
            <Compass size={40} className="text-[var(--crimson)]" />
            Discover
          </h1>
        </div>

        {/* Sort Toggles */}
        <div className="flex bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setSortBy("hot")}
            className={clsx(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-widest transition-all",
              sortBy === "hot" ? "bg-[var(--deep)] text-[var(--white)] shadow-lg" : "text-[var(--dim)] hover:text-[var(--ash)]"
            )}
          >
            <Zap size={14} className={sortBy === "hot" ? "fill-[var(--white)]" : ""} />
            Trending
          </button>
          <button
            onClick={() => setSortBy("recent")}
            className={clsx(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-widest transition-all",
              sortBy === "recent" ? "bg-[var(--deep)] text-[var(--white)] shadow-lg" : "text-[var(--dim)] hover:text-[var(--ash)]"
            )}
          >
            <Clock size={14} />
            Newest
          </button>
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="mb-10 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
        <div className="flex items-center gap-2.5 min-w-max">
          <div className="p-2.5 text-[var(--dim)] mr-1 bg-[var(--surface)] rounded-full border border-[var(--border)]">
            <Filter size={16} />
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                "px-5 py-2.5 rounded-full border text-xs md:text-[11px] font-medium transition-all whitespace-nowrap",
                selectedCategory === cat.id
                  ? "bg-[var(--white)] border-[var(--white)] text-[var(--black)] shadow-lg"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--ash)] hover:border-[var(--dim)] hover:text-[var(--white)]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-px border-t border-[var(--border)]">
        {!feedData ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[var(--surface)] animate-pulse rounded-lg border border-[var(--border)]" />
            ))}
          </div>
        ) : feedData.confessions.length > 0 ? (
          feedData.confessions.map((c) => (
            <ConfessionCard key={c._id} confession={c} />
          ))
        ) : (
          <div className="py-24 text-center border border-[var(--border)] border-dashed rounded-xl">
            <p className="text-[var(--dim)]">No confessions found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
