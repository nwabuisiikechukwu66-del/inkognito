"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Bell, Heart, MessageSquare, Flame, Zap, Moon, Smile, Skull, Eye, HeartHandshake, Frown, Loader2, Repeat, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { clsx } from "clsx";

const REACTION_ICONS: Record<string, any> = {
  flame: Flame,
  heart: Heart,
  zap: Zap,
  droplets: Moon, // Using moon as placeholder if droplets not available or just standardizing
  moon: Moon,
  laugh: Smile,
  skull: Skull,
  handHeart: HeartHandshake,
  angry: Frown,
  eye: Eye,
};

export default function NotificationsPage() {
  const { sessionId } = useAnonSession();
  const notifications = useQuery(api.notifications.getRecent, { sessionId: sessionId || "" });
  const markAllRead = useMutation(api.notifications.markAllRead);

  useEffect(() => {
    if (sessionId) {
      markAllRead({ sessionId });
    }
  }, [sessionId, markAllRead]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-3">
            Activity
          </p>
          <h1 className="text-4xl font-display font-bold text-[var(--white)] flex items-center gap-3">
            <Bell size={32} className="text-[var(--crimson)]" />
            Notifications
          </h1>
        </div>
      </div>

      <div className="space-y-px border-t border-[var(--border)]">
        {!notifications ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[var(--dim)]" size={32} />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => {
            const isReaction = n.type === "reaction";
            const isEcho = n.type === "echo";
            const isPollVote = n.type === "pollVote";
            const isDM = n.type === "dm";
            
            // Try to extract reaction type from content if possible
            let reactionType = "heart";
            if (isReaction) {
              const match = n.content.match(/with (\w+)/);
              if (match) reactionType = match[1];
            }

            const ReactionIcon = isReaction ? (REACTION_ICONS[reactionType] || Heart) : null;

            return (
              <Link 
                key={n._id} 
                href={n.link || "/"}
                className={clsx(
                  "block bg-[var(--black)] hover:bg-[var(--surface)] border-b border-[var(--border)] p-6 transition-colors group relative",
                  !n.isRead && "after:content-[''] after:absolute after:top-1/2 after:right-4 after:-translate-y-1/2 after:w-2 after:h-2 after:bg-[var(--crimson)] after:rounded-full"
                )}
              >
                <div className="flex gap-4">
                  <div className="mt-1">
                    {isReaction ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--crimson-dim)] flex items-center justify-center text-[var(--crimson)]">
                        {ReactionIcon && (
                          <div className="scale-75"><ReactionIcon size={20} className="fill-current" /></div>
                        )}
                      </div>
                    ) : isEcho ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--deep)] border border-[var(--crimson-dim)] flex items-center justify-center text-[var(--crimson)]">
                        <Repeat size={16} />
                      </div>
                    ) : isPollVote ? (
                      <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ash)]">
                        <BarChart2 size={16} />
                      </div>
                    ) : isDM ? (
                      <div className="w-8 h-8 rounded-full bg-[#1e1b4b] flex items-center justify-center text-[#8b5cf6]">
                        <MessageSquare size={16} className="fill-current" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--ash)]">
                        <Bell size={16} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-[var(--white)] font-medium">
                        {n.title}
                      </p>
                      <span className="text-[var(--muted)] font-mono text-[9px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-[var(--ash)] text-sm leading-relaxed">
                      {n.content}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-24 text-center border border-[var(--border)] border-dashed rounded-xl mt-8">
            <Bell size={48} className="text-[var(--border)] mx-auto mb-4 opacity-20" />
            <p className="text-[var(--dim)] font-display text-lg">No notifications yet.</p>
            <p className="text-[var(--muted)] text-sm mt-1">When people react to your confessions, you'll see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

