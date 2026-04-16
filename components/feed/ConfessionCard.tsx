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
import { MessageCircle, Share2, Flag, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";

/* ── Types ─────────────────────────────────────────────────── */
interface ConfessionData {
  _id: Id<"confessions">;
  content: string;
  category: string;
  isNSFW: boolean;
  country?: string;
  city?: string;
  reactionCount: number;
  reactionCounts: Record<string, number>;
  commentCount: number;
  viewCount: number;
  createdAt: number;
}

interface Props {
  confession: ConfessionData;
}

/* ── Reaction definitions ──────────────────────────────────── */
const REACTIONS = [
  { type: "fire",  emoji: "🔥", label: "Fire"  },
  { type: "heart", emoji: "♥",  label: "Heart" },
  { type: "shock", emoji: "⚡", label: "Shock" },
  { type: "tears", emoji: "💧", label: "Tears" },
  { type: "dark",  emoji: "☽",  label: "Dark"  },
];

/* ── Country display ───────────────────────────────────────── */
const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria", US: "United States", GB: "UK", CA: "Canada",
  AU: "Australia", DE: "Germany", FR: "France", IN: "India",
  BR: "Brazil", ZA: "South Africa",
};

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
  async function handleReact(type: string) {
    if (!sessionId) return;

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

  function handleShare() {
    const url = `${window.location.origin}/?c=${confession._id}`;
    const snippet = confession.content.slice(0, 120) + (confession.content.length > 120 ? "…" : "");
    const text = `"${snippet}" — inkognito`;

    if (navigator.share) {
      navigator.share({ title: "Inkognito", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    }
  }

  async function handleReport() {
    if (!sessionId) return;
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

  /* ── Render helpers ───────────────────────────────────────── */
  const isLong = confession.content.length > MAX_PREVIEW_LENGTH;
  const displayText =
    isLong && !isExpanded
      ? confession.content.slice(0, MAX_PREVIEW_LENGTH) + "…"
      : confession.content;

  const timeAgo = formatDistanceToNow(new Date(confession.createdAt), {
    addSuffix: true,
  });

  const locationStr = confession.city
    ? `${confession.city}, ${confession.country ?? ""}`
    : COUNTRY_NAMES[confession.country ?? ""] ?? confession.country ?? "";

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
            {/* Author (always anonymous) */}
            <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
              Anon
              {locationStr && (
                <span className="text-[var(--muted)] ml-1.5">· {locationStr}</span>
              )}
            </span>

            {/* Category badge */}
            <span
              className={clsx(
                "font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5",
                getCategoryBadgeStyle(confession.category)
              )}
            >
              {confession.category}
            </span>

            {/* NSFW badge */}
            {confession.isNSFW && (
              <span className="font-mono text-[9px] text-[var(--crimson)] uppercase tracking-widest border border-[var(--crimson-dim)] px-1.5 py-0.5">
                NSFW
              </span>
            )}
          </div>

          {/* Timestamp */}
          <span className="font-mono text-[10px] text-[var(--muted)]">{timeAgo}</span>
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="relative">
          {/* NSFW blur overlay */}
          {confession.isNSFW && !nsfwRevealed ? (
            <div className="relative">
              <p
                className="text-[var(--ash)] text-sm leading-relaxed select-none"
                style={{ filter: "blur(6px)", userSelect: "none" }}
              >
                {displayText}
              </p>
              <button
                onClick={() => setNsfwRevealed(true)}
                className="absolute inset-0 flex items-center justify-center bg-[var(--black)] bg-opacity-60"
              >
                <span className="font-mono text-xs text-[var(--white)] border border-[var(--border)] px-4 py-2 uppercase tracking-widest hover:border-[var(--crimson)] transition-colors">
                  <Eye size={12} className="inline mr-2" />
                  Reveal NSFW
                </span>
              </button>
            </div>
          ) : (
            <>
              <p className="text-[var(--paper)] text-sm leading-relaxed font-body">
                {displayText}
              </p>

              {/* Read more toggle */}
              {isLong && (
                <button
                  onClick={() => setIsExpanded((v) => !v)}
                  className="mt-2 flex items-center gap-1 font-mono text-[10px] text-[var(--crimson)] uppercase tracking-widest hover:text-[var(--crimson-bright)] transition-colors"
                >
                  {isExpanded ? (
                    <><ChevronUp size={11} /> Show less</>
                  ) : (
                    <><ChevronDown size={11} /> Read more</>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Reaction bar ────────────────────────────────── */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => handleReact(r.type)}
                title={r.label}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 text-[11px] transition-all duration-150 border",
                  myReaction === r.type
                    ? "border-[var(--crimson-dim)] bg-[var(--crimson-dim)] text-[var(--white)]"
                    : "border-transparent text-[var(--dim)] hover:border-[var(--border)] hover:text-[var(--ash)]"
                )}
              >
                <span className="text-[13px]">{r.emoji}</span>
                {(localCounts[r.type] ?? 0) > 0 && (
                  <span className="font-mono text-[9px]">
                    {localCounts[r.type]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Action buttons: comment, share, report */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
            >
              <MessageCircle size={13} />
              {confession.commentCount > 0 && (
                <span className="font-mono text-[10px]">{confession.commentCount}</span>
              )}
            </button>
            <button
              onClick={handleShare}
              className="text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
              title="Share"
            >
              <Share2 size={13} />
            </button>
            <button
              onClick={handleReport}
              className="text-[var(--dim)] hover:text-[var(--crimson)] transition-colors opacity-0 group-hover:opacity-100"
              title="Report"
            >
              <Flag size={12} />
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
  const [submitting, setSubmitting] = useState(false);
  const addComment = useMutation(api.confessions.addComment);
  const comments = useQuery(api.confessions.getById, { id: confessionId });

  async function submit() {
    if (!text.trim() || !sessionId) return;
    setSubmitting(true);
    try {
      await addComment({ confessionId, sessionId, content: text });
      setText("");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a reply..."
          maxLength={500}
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--muted)] focus:border-[var(--dim)] transition-colors"
        />
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--ash)] font-mono text-[10px] uppercase tracking-widest hover:border-[var(--crimson)] hover:text-[var(--white)] disabled:opacity-40 transition-all"
        >
          Post
        </button>
      </div>

      {/* Comment list */}
      <div className="space-y-3">
        {comments?.comments?.map((c) => (
          <div key={c._id} className="flex gap-3">
            <div className="w-px bg-[var(--border)] flex-shrink-0 mt-1" />
            <div>
              <span className="font-mono text-[9px] text-[var(--muted)] uppercase">Anon · </span>
              <span className="font-mono text-[9px] text-[var(--muted)]">
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </span>
              <p className="text-[var(--ash)] text-xs mt-1 leading-relaxed">{c.content}</p>
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
