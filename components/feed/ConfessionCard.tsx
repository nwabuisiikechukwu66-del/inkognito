/**
 * ConfessionCard — components/feed/ConfessionCard.tsx
 *
 * Displays a single confession in the feed.
 *
 * Features:
 * - Anonymous author display (country flag + "Anonymous")
 * - Category badge
 * - NSFW blur overlay (click to reveal)
 * - Reaction bar (fire/heart/shock/tears/dark)
 * - Comment count
 * - Share button (copies snippet link to clipboard)
 * - Report button
 * - Expandable full text for long confessions
 *
 * Design: Dark card, left border accent, editorial typography.
 */

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Share2, Flag, ChevronDown, ChevronUp, Eye, Flame, Heart, Zap, Droplets, Moon, Smile, Skull, HeartHandshake, Frown, Bookmark, Repeat, Share, CheckCircle2, MoreHorizontal, Twitter, MessageSquare, Link2, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ── Types ─────────────────────────────────────────────────── */
interface ConfessionData {
  _id: Id<"confessions">;
  content: string;
  category: string;
  isNSFW: boolean;
  authorUsername?: string;
  reactionCount: number;
  reactionCounts: Record<string, number>;
  commentCount: number;
  viewCount: number;
  createdAt: number;
  echoCount?: number;
  shareCount?: number;
  isBookmarked?: boolean;
  isEchoed?: boolean;
  authorIsPremium?: boolean;
  poll?: {
    question: string;
    optionA: string;
    optionB: string;
  };
  mood?: string;
  pollResults?: {
    countA: number;
    countB: number;
    total: number;
    userVote?: string;
  };
}

interface Props {
  confession: ConfessionData;
}

/* ── Reaction definitions ──────────────────────────────────── */
const REACTIONS = [
  { type: "flame", icon: Flame, label: "Fire" },
  { type: "heart", icon: Heart, label: "Love" },
  { type: "zap", icon: Zap, label: "Shock" },
  { type: "droplets", icon: Droplets, label: "Tears" },
  { type: "moon", icon: Moon, label: "Dark" },
  { type: "laugh", icon: Smile, label: "Funny" },
  { type: "skull", icon: Skull, label: "Dead" },
  { type: "handHeart", icon: HeartHandshake, label: "Support" },
  { type: "angry", icon: Frown, label: "Angry" },
  { type: "eye", icon: Eye, label: "Watching" },
];

const MAX_PREVIEW_LENGTH = 280; // Characters before "Read more"

export function ConfessionCard({ confession }: Props) {
  const { sessionId } = useAnonSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [nsfwRevealed, setNsfwRevealed] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState(confession.reactionCounts);
  const [showComments, setShowComments] = useState(false);

  const reactMutation = useMutation(api.confessions.react);
  const reportMutation = useMutation(api.confessions.report);
  const incrementView = useMutation(api.confessions.incrementView);
  const toggleBookmark = useMutation(api.confessions.toggleBookmark);
  const toggleEcho = useMutation(api.confessions.toggleEcho);
  const voteInPoll = useMutation(api.confessions.voteInPoll);
  const incrementShare = useMutation(api.confessions.incrementShare);

  const [bookmarked, setBookmarked] = useState(confession.isBookmarked);
  const [echoed, setEchoed] = useState(confession.isEchoed);
  const [echoCount, setEchoCount] = useState(confession.echoCount || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Increment view on render (once per session via localStorage debounce)
  useState(() => {
    if (typeof window === "undefined") return;
    const key = `ink_viewed_${confession._id}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      incrementView({ confessionId: confession._id }).catch(() => {});
    }
  });

  /* ── Handlers ─────────────────────────────────────────────── */
  const startDM = useMutation(api.dms.startDMWithAuthor);
  const router = useRouter();

  async function handleDM() {
    if (!sessionId) {
      toast.error("Connecting to the void...");
      return;
    }
    const tid = toast.loading("Opening shadow frequency...");
    try {
      const dmId = await startDM({ initiatorSessionId: sessionId, confessionId: confession._id });
      toast.success("Frequency open.", { id: tid });
      router.push(`/chat/${dmId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not open frequency.", { id: tid });
    }
  }

  async function handleReact(type: string) {
    if (!sessionId) {
      toast.error("Connecting to the void... please wait.");
      return;
    }

    // Optimistic update
    const prev = myReaction;
    const newCounts = { ...localCounts };

    if (prev === type) {
      // Toggle off
      newCounts[type] = Math.max(0, (newCounts[type] ?? 0) - 1);
      setMyReaction(null);
    } else {
      if (prev) newCounts[prev] = Math.max(0, (newCounts[prev] ?? 0) - 1);
      newCounts[type] = (newCounts[type] ?? 0) + 1;
      setMyReaction(type);
    }
    setLocalCounts(newCounts);

    try {
      await reactMutation({ confessionId: confession._id, sessionId, type });
    } catch {
      // Revert on error
      setLocalCounts(confession.reactionCounts);
      setMyReaction(prev);
      toast.error("Reaction failed.");
    }
  }



  async function handleReport() {
    if (!sessionId) {
      toast.error("Connecting to the void... please wait.");
      return;
    }
    try {
      await reportMutation({
        targetId: confession._id,
        targetType: "confession",
        reporterSessionId: sessionId,
        reason: "other",
      });
      toast.success("Reported. Thank you.");
    } catch {
      toast.error("Failed to report.");
    }
  }

  async function handleBookmark() {
    if (!sessionId) {
      toast.error("Connecting to the void... please wait.");
      return;
    }
    try {
      const res = await toggleBookmark({ confessionId: confession._id, sessionId });
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch {
      toast.error("Failed to bookmark.");
    }
  }

  async function handleEcho() {
    if (!sessionId) {
      toast.error("Connecting to the void... please wait.");
      return;
    }
    try {
      const res = await toggleEcho({ confessionId: confession._id, sessionId });
      setEchoed(res.echoed);
      setEchoCount(prev => res.echoed ? prev + 1 : Math.max(0, prev - 1));
      toast.success(res.echoed ? "Echoed to the void" : "Echo removed");
    } catch {
      toast.error("Failed to echo.");
    }
  }

  async function handleVote(option: "A" | "B") {
    if (!sessionId) return;
    try {
      await voteInPoll({ confessionId: confession._id, sessionId, option });
      toast.success("Vote recorded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to vote.");
    }
  }

  async function handleShare(platform: "twitter" | "whatsapp" | "copy") {
    const url = `${window.location.origin}/c/${confession._id}`;
    const text = `Read this confession on Inkognito: "${confession.content.slice(0, 50)}..."`;

    try {
      await incrementShare({ confessionId: confession._id });
      if (platform === "twitter") {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
      } else if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {
      toast.error("Failed to share.");
    }
    setShowShareMenu(false);
  }

  /* ── Render helpers ───────────────────────────────────────── */
  const isLong = confession.content.length > MAX_PREVIEW_LENGTH;
  const displayText =
    isLong && !isExpanded
      ? confession.content.slice(0, MAX_PREVIEW_LENGTH) + "…"
      : confession.content;

  const timeAgo = formatDistanceToNow(new Date(confession.createdAt), {
    addSuffix: true,
  });

  return (
    <article
      className={clsx(
        "relative border-b border-[var(--border)] bg-[var(--black)] hover:bg-[var(--deep)] transition-colors duration-150 group",
        "border-l-2",
        getCategoryBorderColor(confession.category)
      )}
    >
      <div className="p-5">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Author */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest font-bold">
                {confession.authorUsername ? confession.authorUsername : "Anon"}
              </span>
              <button
                onClick={handleDM}
                className="text-[var(--muted)] hover:text-[var(--crimson)] transition-colors p-1"
                title="Shadow Message"
              >
                <MessageSquare size={12} />
              </button>
            </div>

            {/* Category badge */}
            <span
              className={clsx(
                "font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5",
                getCategoryBadgeStyle(confession.category)
              )}
            >
              {confession.category}
            </span>

            {/* Premium Badge */}
            {confession.authorIsPremium && (
              <div className="flex items-center gap-1 text-[var(--crimson)]" title="Verified Plus Member">
                <CheckCircle2 size={10} fill="currentColor" className="text-[var(--black)]" />
                <span className="font-mono text-[8px] uppercase tracking-tighter font-bold">Plus</span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-3">
            {confession.mood && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--ash)] font-mono text-[9px] uppercase tracking-widest">
                <span>{getMoodIcon(confession.mood)}</span>
                <span>{confession.mood.replace("_", " ")}</span>
              </div>
            )}
            <span className="font-mono text-[10px] text-[var(--muted)]">{timeAgo}</span>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="mb-6">
          {confession.isNSFW && !nsfwRevealed ? (
            <div 
              className="relative rounded overflow-hidden cursor-pointer"
              onClick={() => setNsfwRevealed(true)}
            >
              <p 
                className="text-[var(--ash)] text-sm leading-relaxed select-none"
                style={{ filter: "blur(10px)", userSelect: "none" }}
              >
                {displayText}
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--black)]/40 hover:bg-[var(--black)]/20 transition-colors">
                <span className="font-mono text-[10px] text-[var(--white)] border border-[var(--white)] px-4 py-2 uppercase tracking-widest">
                  Reveal NSFW
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[var(--paper)] leading-relaxed whitespace-pre-wrap selection:bg-[var(--crimson)] selection:text-white">
              {displayText}
              {isLong && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ml-2 text-[var(--crimson)] hover:underline text-xs font-mono uppercase tracking-widest"
                >
                  {isExpanded ? "[ Show less ]" : "[ Read full ]"}
                </button>
              )}
            </p>
          )}
        </div>

        {/* ── Poll UI ─────────────────────────────────────── */}
        {confession.poll && confession.pollResults && (
          <div className="mb-8 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--ash)] mb-4 flex items-center gap-2">
              <Timer size={14} />
              Void Poll: {confession.poll.question}
            </h4>
            <div className="space-y-3">
              {[
                { id: "A", label: confession.poll.optionA, count: confession.pollResults.countA },
                { id: "B", label: confession.poll.optionB, count: confession.pollResults.countB }
              ].map((opt) => {
                const percent = confession.pollResults!.total > 0 
                  ? Math.round((opt.count / confession.pollResults!.total) * 100) 
                  : 0;
                const isSelected = confession.pollResults!.userVote === opt.id;
                
                return (
                  <button
                    key={opt.id}
                    disabled={!!confession.pollResults!.userVote}
                    onClick={() => handleVote(opt.id as "A" | "B")}
                    className={clsx(
                      "w-full relative h-12 border transition-all overflow-hidden group",
                      isSelected ? "border-[var(--crimson)]" : "border-[var(--border)] hover:border-[var(--dim)]"
                    )}
                  >
                    <div 
                      className={clsx(
                        "absolute inset-0 opacity-10 transition-all",
                        isSelected ? "bg-[var(--crimson)]" : "bg-[var(--ash)]"
                      )} 
                      style={{ width: `${percent}%` }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <span className={clsx(
                        "text-xs font-medium",
                        isSelected ? "text-[var(--crimson)]" : "text-[var(--white)]"
                      )}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--dim)] group-hover:text-[var(--ash)]">
                        {percent}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[9px] font-mono text-[var(--muted)] text-right uppercase tracking-widest">
              {confession.pollResults.total} shadows have voted
            </p>
          </div>
        )}

        {/* ── Action Bar (Reactions + Actions) ────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-8 pt-4 border-t border-[var(--border)]/50">
          {/* Reactions - Horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap">
            {REACTIONS.map((r) => {
              const Icon = r.icon;
              const active = myReaction === r.type;
              return (
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  key={r.type}
                  onClick={() => handleReact(r.type)}
                  title={r.label}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 border",
                    active
                      ? "border-[var(--crimson-dim)] bg-[var(--crimson-dim)] text-[var(--white)] shadow-[0_0_10px_rgba(196,30,58,0.3)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--crimson-dim)] hover:text-[var(--crimson)]"
                  )}
                >
                  <Icon size={14} className={active ? "fill-current" : ""} />
                  {(localCounts[r.type] ?? 0) > 0 && (
                    <span className="font-mono text-[10px] font-medium">
                      {localCounts[r.type]}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Action buttons - Spaced evenly on mobile */}
          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-4 px-2 sm:px-0">
            <button
              onClick={() => setShowComments(!showComments)}
              className={clsx(
                "flex items-center gap-2 transition-colors",
                showComments ? "text-[var(--white)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
              )}
            >
              <MessageCircle size={15} className={clsx(showComments && "text-[var(--crimson)]")} />
              <span className="font-mono text-[10px]">{confession.commentCount}</span>
            </button>

            <button
              onClick={handleEcho}
              className={clsx(
                "flex items-center gap-2 transition-colors",
                echoed ? "text-[var(--white)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
              )}
              title="Echo"
            >
              <Repeat size={15} className={clsx(echoed && "text-[var(--crimson)]")} />
              <span className="font-mono text-[10px]">{echoCount}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={clsx(
                "flex items-center gap-2 transition-colors",
                bookmarked ? "text-[var(--crimson)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
              )}
              title="Bookmark"
            >
              <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={clsx(
                  "flex items-center gap-2 transition-colors",
                  confession.shareCount && confession.shareCount > 0 ? "text-[var(--ash)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
                )}
                title="Share"
              >
                <Share2 size={15} />
                {(confession.shareCount ?? 0) > 0 && (
                  <span className="font-mono text-[10px]">{confession.shareCount}</span>
                )}
              </button>

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--surface)] border border-[var(--border)] p-1 rounded-lg z-20 shadow-2xl min-w-[140px]"
                  >
                    <button onClick={() => handleShare("twitter")} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[var(--ash)] hover:text-white hover:bg-[var(--deep)] transition-colors rounded-md">
                      <Twitter size={14} />
                      Twitter
                    </button>
                    <button onClick={() => handleShare("whatsapp")} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[var(--ash)] hover:text-white hover:bg-[var(--deep)] transition-colors rounded-md">
                      <MessageSquare size={14} />
                      WhatsApp
                    </button>
                    <button onClick={() => handleShare("copy")} className="flex items-center gap-3 w-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[var(--ash)] hover:text-white hover:bg-[var(--deep)] transition-colors rounded-md border-t border-[var(--border)] mt-1">
                      <Link2 size={14} />
                      Copy Link
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleReport}
              className="text-[var(--dim)] hover:text-[var(--crimson)] transition-colors group-hover:opacity-100"
              title="Report"
            >
              <Flag size={14} />
            </button>
          </div>
        </div>

        {/* ── Inline comments ─────────────────────────────── */}
        {showComments && (
          <CommentSection confessionId={confession._id} sessionId={sessionId} />
        )}
      </div>
    </article>
  );
}

/* ── Comment Section ───────────────────────────────────────── */
function CommentSection({
  confessionId,
  sessionId,
}: {
  confessionId: Id<"confessions">;
  sessionId: string;
}) {
  const [text, setText] = useState("");
  const [isWhisper, setIsWhisper] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const addComment = useMutation(api.confessions.addComment);
  const data = useQuery(api.confessions.getById, { id: confessionId, sessionId });

  async function submit() {
    if (!text.trim() || !sessionId) return;
    setSubmitting(true);
    try {
      await addComment({ 
        confessionId, 
        sessionId, 
        content: text,
        type: isWhisper ? "whisper" : "normal",
        isFading 
      });
      setText("");
      setIsWhisper(false);
      setIsFading(false);
      toast.success(isWhisper ? "Whisper sent to author" : "Reply posted");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      {/* Comment input */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={isWhisper ? "Whisper only the author can see..." : "Add a reply..."}
            maxLength={500}
            className={clsx(
              "flex-1 bg-[var(--surface)] border px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--muted)] transition-all",
              isWhisper ? "border-[var(--crimson)] ring-1 ring-[var(--crimson-dim)]" : "border-[var(--border)] focus:border-[var(--dim)]"
            )}
          />
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--ash)] font-mono text-[10px] uppercase tracking-widest hover:border-[var(--crimson)] hover:text-[var(--white)] disabled:opacity-40 transition-all"
          >
            Post
          </button>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 px-1">
          <button 
            onClick={() => setIsWhisper(!isWhisper)}
            className={clsx(
              "flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors",
              isWhisper ? "text-[var(--crimson)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
            )}
          >
            <Eye size={12} className={isWhisper ? "fill-current" : ""} />
            Whisper
          </button>
          <button 
            onClick={() => setIsFading(!isFading)}
            className={clsx(
              "flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors",
              isFading ? "text-[var(--crimson)]" : "text-[var(--dim)] hover:text-[var(--ash)]"
            )}
          >
            <Timer size={12} />
            Fading (24h)
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="space-y-4">
        {data?.comments?.map((c) => (
          <div key={c._id} className="flex gap-3">
            <div className={clsx(
              "w-px flex-shrink-0 mt-1",
              c.type === "whisper" ? "bg-[var(--crimson)]" : "bg-[var(--border)]"
            )} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] text-[var(--muted)] uppercase">
                  {c.sessionId === data.sessionId ? "You" : "Anon"}
                </span>
                <span className="text-[10px] text-[var(--muted)]">•</span>
                <span className="font-mono text-[9px] text-[var(--muted)]">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
                
                {/* Badges */}
                {c.type === "whisper" && (
                  <span className="font-mono text-[8px] bg-[var(--crimson-dim)] text-[var(--crimson)] px-1 uppercase tracking-tighter border border-[var(--crimson-dim)]">
                    Whisper
                  </span>
                )}
                {c.expiresAt && (
                  <span className="flex items-center gap-1 font-mono text-[8px] text-[var(--ash)] border border-[var(--border)] px-1 uppercase tracking-tighter">
                    <Timer size={8} /> Fading
                  </span>
                )}
              </div>
              <p className={clsx(
                "text-xs leading-relaxed",
                c.type === "whisper" ? "text-[var(--paper)] italic" : "text-[var(--ash)]"
              )}>
                {c.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Style helpers ─────────────────────────────────────────── */
function getCategoryBorderColor(category: string): string {
  const map: Record<string, string> = {
    sexual: "border-l-[var(--crimson)]",
    relationship: "border-l-[#8B5CF6]",
    dark: "border-l-[var(--dim)]",
    work: "border-l-[#F59E0B]",
    family: "border-l-[#10B981]",
    funny: "border-l-[#06B6D4]",
    other: "border-l-[var(--muted)]",
  };
  return map[category] ?? "border-l-[var(--muted)]";
}

function getCategoryBadgeStyle(category: string): string {
  const map: Record<string, string> = {
    sexual: "bg-[var(--crimson-dim)] text-[var(--crimson)]",
    relationship: "bg-[#1E1B4B] text-[#8B5CF6]",
    dark: "bg-[var(--surface)] text-[var(--dim)]",
    work: "bg-[#451A03] text-[#F59E0B]",
    family: "bg-[#022C22] text-[#10B981]",
    funny: "bg-[#0C1A1F] text-[#06B6D4]",
    other: "bg-[var(--surface)] text-[var(--mid)]",
  };
  return map[category] ?? "bg-[var(--surface)] text-[var(--mid)]";
}

function getMoodIcon(mood: string): string {
  const map: Record<string, string> = {
    guilty: "⚖️",
    relieved: "🍃",
    seeking_advice: "💡",
    just_venting: "😤",
    heartbroken: "💔",
    proud: "✨",
  };
  return map[mood] ?? "🌫️";
}

