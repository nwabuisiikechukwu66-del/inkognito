"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Bell, Heart, MessageSquare, Flame, Zap, Moon, Smile, Skull, Eye, HeartHandshake, Frown, Loader2, Repeat, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

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
  const notifications = useQuery(api.confessions.getNotifications, { sessionId: sessionId || "" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-3">
          Activity
        </p>
        <h1 className="text-4xl font-display font-bold text-[var(--white)] flex items-center gap-3">
          <Bell size={32} className="text-[var(--crimson)]" />
          Notifications
        </h1>
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
            const reactionType = isReaction ? (n as any).reactionType : undefined;
            const content = n.type === "comment" ? (n as any).content : undefined;
            const option = isPollVote ? (n as any).option : undefined;
            const ReactionIcon = isReaction ? (REACTION_ICONS[reactionType] || Heart) : null;

            return (
              <Link 
                key={`${n.type}-${n.id}`} 
                href={`/c/${n.confessionId}`}
                className="block bg-[var(--black)] hover:bg-[var(--surface)] border-b border-[var(--border)] p-6 transition-colors group"
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
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1e1b4b] flex items-center justify-center text-[#8b5cf6]">
                        <MessageSquare size={16} className="fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-[var(--white)] font-medium">
                        {isReaction ? (
                          <>Someone reacted with <span className="text-[var(--crimson)] font-mono text-[10px] uppercase border border-[var(--crimson-dim)] px-1 mx-1">{reactionType}</span> to your confession</>
                        ) : isEcho ? (
                          <>Someone <span className="text-[var(--crimson)] font-mono text-[10px] uppercase border border-[var(--crimson-dim)] px-1 mx-1">echoed</span> your confession</>
                        ) : isPollVote ? (
                          <>Someone voted <span className="text-[var(--white)] font-mono text-[10px] uppercase border border-[var(--border)] px-1 mx-1">Option {option}</span> on your poll</>
                        ) : (
                          <>Someone replied to your confession</>
                        )}
                      </p>
                      <span className="text-[var(--muted)] font-mono text-[9px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {!isReaction && content && (
                      <p className="text-[var(--ash)] text-sm line-clamp-2 italic bg-[var(--deep)] p-3 rounded-lg border border-[var(--border)] mt-2">
                        "{content}"
                      </p>
                    )}
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
