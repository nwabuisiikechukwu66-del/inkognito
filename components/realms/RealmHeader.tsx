/**
 * RealmHeader — components/realms/RealmHeader.tsx
 *
 * Full-width header for individual realm pages.
 * Shows realm name, description, rules, member count, and join/leave button.
 * Atmospheric background with realm theme color.
 */

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Users, Check, Plus, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";

interface RealmHeaderProps {
  realm: {
    _id: Id<"realms">;
    name: string;
    slug: string;
    description: string;
    emoji: string;
    category: string;
    themeColor: string;
    bgGradient?: string;
    rules?: string;
    memberCount: number;
    isJoined: boolean;
    confessionCount: number;
  };
}

export function RealmHeader({ realm }: RealmHeaderProps) {
  const { sessionId } = useAnonSession();
  const joinMutation = useMutation(api.realms.joinRealm);
  const leaveMutation = useMutation(api.realms.leaveRealm);
  const [isJoined, setIsJoined] = useState(realm.isJoined);
  const [memberCount, setMemberCount] = useState(realm.memberCount);
  const [joining, setJoining] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handleToggleJoin = async () => {
    if (!sessionId || joining) return;

    setJoining(true);
    try {
      if (isJoined) {
        await leaveMutation({ realmId: realm._id, sessionId });
        setIsJoined(false);
        setMemberCount((c) => Math.max(0, c - 1));
        toast.success("Left realm");
      } else {
        await joinMutation({ realmId: realm._id, sessionId });
        setIsJoined(true);
        setMemberCount((c) => c + 1);
        toast.success(`Entered ${realm.name}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden border-b border-[var(--border)]"
      style={{
        background: realm.bgGradient || `linear-gradient(135deg, ${realm.themeColor}12 0%, #0a0a0b 100%)`,
      }}
    >
      {/* Accent line */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${realm.themeColor}, transparent)` }}
      />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14 relative z-10">
        {/* Category badge */}
        <p
          className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4"
          style={{ color: realm.themeColor }}
        >
          {realm.category.replace("_", " ")} realm
        </p>

        {/* Emoji + Name */}
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl md:text-6xl">{realm.emoji}</span>
          <div className="flex-1">
            <h1 className="font-display font-bold text-3xl md:text-4xl text-[var(--white)] leading-tight">
              {realm.name}
            </h1>
            <p className="text-[var(--ash)] text-sm leading-relaxed mt-2 max-w-lg">
              {realm.description}
            </p>
          </div>
        </div>

        {/* Stats + Actions */}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: realm.themeColor }} />
            <span className="font-mono text-[11px] text-[var(--ash)] uppercase tracking-widest">
              {memberCount.toLocaleString()} souls
            </span>
          </div>

          <span className="text-[var(--border)]">·</span>

          <span className="font-mono text-[11px] text-[var(--dim)] uppercase tracking-widest">
            {realm.confessionCount.toLocaleString()} confessions
          </span>

          <div className="ml-auto flex items-center gap-3">
            {realm.rules && (
              <button
                onClick={() => setShowRules(!showRules)}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-[var(--dim)] hover:text-[var(--ash)] border border-[var(--border)] transition-all"
              >
                <BookOpen size={12} />
                Rules
                {showRules ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}

            <button
              onClick={handleToggleJoin}
              disabled={joining}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 text-[11px] font-mono uppercase tracking-widest transition-all",
                isJoined
                  ? "bg-[var(--surface)] text-[var(--ash)] border border-[var(--border)] hover:border-[var(--muted)]"
                  : "text-white hover:brightness-110"
              )}
              style={!isJoined ? { background: realm.themeColor } : {}}
            >
              {joining ? (
                "..."
              ) : isJoined ? (
                <>
                  <Check size={12} />
                  Joined
                </>
              ) : (
                <>
                  <Plus size={12} />
                  Enter This Realm
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rules dropdown */}
        <AnimatePresence>
          {showRules && realm.rules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 p-5 border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm">
                <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--dim)] mb-3">
                  Realm Rules
                </p>
                <p className="text-[var(--ash)] text-sm leading-relaxed">
                  {realm.rules}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ghost emoji background */}
      <div
        className="absolute right-[-2rem] top-1/2 -translate-y-1/2 text-[20vw] opacity-[0.03] select-none pointer-events-none"
        aria-hidden
      >
        {realm.emoji}
      </div>
    </div>
  );
}
