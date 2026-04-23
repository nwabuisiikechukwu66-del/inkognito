/**
 * DM List Page — app/chat/dm/page.tsx
 * 
 * Shows all active 1-on-1 shadow frequencies.
 */

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { MessageSquare, Loader2, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function DMListPage() {
  const { sessionId } = useAnonSession();
  const dms = useQuery(api.dms.getMyDMs, { sessionId: sessionId || "" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-3">
          Shadow Frequencies
        </p>
        <h1 className="text-4xl font-display font-bold text-[var(--white)] flex items-center gap-3">
          <MessageSquare size={32} className="text-[var(--crimson)]" />
          Direct Messages
        </h1>
      </div>

      <div className="space-y-px border-t border-[var(--border)]">
        {!dms ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[var(--dim)]" size={32} />
          </div>
        ) : dms.length > 0 ? (
          dms.map((dm) => (
            <Link 
              key={dm._id} 
              href={`/chat/dm/${dm._id}`}
              className="block bg-[var(--black)] hover:bg-[var(--deep)] border-b border-[var(--border)] p-6 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ash)]">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="text-[var(--white)] font-bold text-lg mb-0.5">
                      {dm.otherUsername}
                    </h3>
                    <p className="text-[var(--dim)] font-mono text-[10px] uppercase tracking-widest">
                      Active frequency
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[var(--muted)] font-mono text-[9px] mb-2">
                    {formatDistanceToNow(new Date(dm.lastMessageAt), { addSuffix: true })}
                  </p>
                  <div className="text-[var(--crimson)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={20} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-24 text-center border border-[var(--border)] border-dashed rounded-xl mt-8">
            <MessageSquare size={48} className="text-[var(--border)] mx-auto mb-4 opacity-20" />
            <p className="text-[var(--dim)] font-display text-lg">Silence.</p>
            <p className="text-[var(--muted)] text-sm mt-1">You haven't opened any shadow frequencies yet.</p>
            <Link 
              href="/discover"
              className="inline-block mt-6 px-6 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--ash)] font-mono text-[10px] uppercase tracking-widest hover:border-[var(--crimson)] hover:text-white transition-all"
            >
              Discover Confessions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
