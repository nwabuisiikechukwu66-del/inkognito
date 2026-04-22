"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { ConfessionCard } from "@/components/feed/ConfessionCard";
import { Bookmark, Loader2 } from "lucide-react";

export default function BookmarksPage() {
  const { sessionId } = useAnonSession();
  const bookmarks = useQuery(api.confessions.getBookmarks, { sessionId: sessionId || "" });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-3">
          Saved
        </p>
        <h1 className="text-4xl font-display font-bold text-[var(--white)] flex items-center gap-3">
          <Bookmark size={32} className="text-[var(--crimson)]" />
          Bookmarks
        </h1>
      </div>

      <div className="space-y-px border-t border-[var(--border)]">
        {!bookmarks ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[var(--dim)]" size={32} />
          </div>
        ) : bookmarks.length > 0 ? (
          bookmarks.map((c: any) => (
            <ConfessionCard key={c._id} confession={c} />
          ))
        ) : (
          <div className="py-24 text-center border border-[var(--border)] border-dashed rounded-xl mt-8">
            <Bookmark size={48} className="text-[var(--border)] mx-auto mb-4 opacity-20" />
            <p className="text-[var(--dim)] font-display text-lg">Your bookmarks are empty.</p>
            <p className="text-[var(--muted)] text-sm mt-1">Save confessions to read them later or keep them safe.</p>
          </div>
        )}
      </div>
    </div>
  );
}
