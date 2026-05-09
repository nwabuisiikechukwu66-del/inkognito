/**
 * RealmBrowser — app/realms/RealmBrowser.tsx
 *
 * Client component for the realm discovery page.
 * Features: category filters, search, responsive grid.
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { RealmCard } from "@/components/realms/RealmCard";
import { Globe, Search, Filter, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

const CATEGORIES = [
  { id: "all", label: "All Realms", icon: "🌐" },
  { id: "culture", label: "Culture", icon: "🌍" },
  { id: "life_stage", label: "Life Stage", icon: "🎓" },
  { id: "interest", label: "Interest", icon: "💡" },
  { id: "creative", label: "Creative", icon: "🎨" },
];

export function RealmBrowser() {
  const { sessionId } = useAnonSession();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const realms = useQuery(api.realms.listPublic, {
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    sessionId: sessionId || undefined,
  });

  const filteredRealms = useMemo(() => {
    if (!realms) return [];
    if (!searchQuery.trim()) return realms;
    const q = searchQuery.toLowerCase();
    return realms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [realms, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="font-mono text-[11px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-4">
            <Sparkles size={12} className="inline mr-2" />
            Enter the Shadows
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[var(--white)] flex items-center gap-4">
            <Globe size={40} className="text-[var(--crimson)]" />
            Shadow Realms
          </h1>
          <p className="text-[var(--ash)] text-sm mt-3 max-w-lg leading-relaxed">
            Focused spaces for every truth. Join the realms that resonate with your soul.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dim)]"
        />
        <input
          type="text"
          placeholder="Search realms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--border)] pl-11 pr-4 py-3.5 text-sm text-[var(--white)] placeholder:text-[var(--muted)] focus:border-[var(--dim)] transition-colors"
        />
      </div>

      {/* Category Filters */}
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
                "flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs md:text-[11px] font-medium transition-all whitespace-nowrap",
                selectedCategory === cat.id
                  ? "bg-[var(--white)] border-[var(--white)] text-[var(--black)] shadow-lg"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--ash)] hover:border-[var(--dim)] hover:text-[var(--white)]"
              )}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Realm Grid */}
      {!realms ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] bg-[var(--surface)] animate-pulse border border-[var(--border)]"
            />
          ))}
        </div>
      ) : filteredRealms.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {filteredRealms.map((realm) => (
            <motion.div
              key={realm._id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              <RealmCard realm={realm} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="py-24 text-center border border-[var(--border)] border-dashed">
          <p className="font-display text-3xl italic text-[var(--muted)] mb-3">
            No realms found.
          </p>
          <p className="text-[var(--dim)] text-sm font-mono">
            {searchQuery
              ? "Try a different search term."
              : "No realms in this category yet."}
          </p>
        </div>
      )}
    </div>
  );
}
