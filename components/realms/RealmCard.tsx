/**
 * RealmCard — components/realms/RealmCard.tsx
 *
 * Atmospheric preview card for a realm.
 * Shows emoji, name, description, member count, and join button.
 * Gradient background based on realm theme color.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Users, ArrowRight, Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";

interface RealmCardProps {
  realm: {
    _id: Id<"realms">;
    name: string;
    slug: string;
    description: string;
    emoji: string;
    category: string;
    themeColor: string;
    bgGradient?: string;
    memberCount: number;
    isJoined: boolean;
  };
  variant?: "grid" | "compact" | "featured";
}

export function RealmCard({ realm, variant = "grid" }: RealmCardProps) {
  const { sessionId } = useAnonSession();
  const joinMutation = useMutation(api.realms.joinRealm);
  const leaveMutation = useMutation(api.realms.leaveRealm);
  const [isJoined, setIsJoined] = useState(realm.isJoined);
  const [memberCount, setMemberCount] = useState(realm.memberCount);
  const [joining, setJoining] = useState(false);

  const handleToggleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  if (variant === "compact") {
    return (
      <Link
        href={`/realms/${realm.slug}`}
        className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--surface)] transition-all group"
      >
        <span className="text-lg flex-shrink-0">{realm.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--white)] font-medium truncate group-hover:text-[var(--paper)] transition-colors">
            {realm.name}
          </p>
          <p className="text-[9px] font-mono text-[var(--dim)] uppercase tracking-wider">
            {memberCount} souls
          </p>
        </div>
        <ArrowRight size={12} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link href={`/realms/${realm.slug}`} className="block group">
        <motion.div
          className="relative overflow-hidden border border-[var(--border)] hover:border-[var(--muted)] transition-all duration-300 min-w-[280px] h-[180px]"
          style={{
            background: realm.bgGradient || `linear-gradient(135deg, ${realm.themeColor}15 0%, #0a0a0b 100%)`,
          }}
          whileHover={{ y: -2 }}
        >
          {/* Accent glow */}
          <div
            className="absolute top-0 left-0 w-full h-1 opacity-60"
            style={{ background: realm.themeColor }}
          />

          <div className="relative z-10 p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{realm.emoji}</span>
                <button
                  onClick={handleToggleJoin}
                  disabled={joining}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-sm",
                    isJoined
                      ? "bg-[var(--surface)] text-[var(--ash)] border border-[var(--border)]"
                      : "text-[var(--white)] border border-current",
                  )}
                  style={!isJoined ? { color: realm.themeColor, borderColor: realm.themeColor } : {}}
                >
                  {isJoined ? <Check size={10} /> : <Plus size={10} />}
                  {isJoined ? "Joined" : "Enter"}
                </button>
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--white)] group-hover:text-[var(--paper)] transition-colors">
                {realm.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <Users size={11} className="text-[var(--dim)]" />
              <span className="font-mono text-[9px] text-[var(--dim)] uppercase tracking-widest">
                {memberCount.toLocaleString()} souls
              </span>
            </div>
          </div>

          {/* Ghost emoji background */}
          <div className="absolute right-[-10px] bottom-[-10px] text-8xl opacity-[0.04] select-none" aria-hidden>
            {realm.emoji}
          </div>
        </motion.div>
      </Link>
    );
  }

  // Default grid variant
  return (
    <Link href={`/realms/${realm.slug}`} className="block group">
      <motion.div
        className="relative overflow-hidden border border-[var(--border)] hover:border-[var(--muted)] transition-all duration-300"
        style={{
          background: realm.bgGradient || `linear-gradient(135deg, ${realm.themeColor}10 0%, #0a0a0b 100%)`,
        }}
        whileHover={{ y: -2, boxShadow: `0 8px 30px ${realm.themeColor}15` }}
      >
        {/* Top accent line */}
        <div
          className="h-0.5 w-full opacity-50"
          style={{ background: realm.themeColor }}
        />

        <div className="p-6">
          {/* Emoji + Category */}
          <div className="flex items-start justify-between mb-4">
            <span className="text-3xl">{realm.emoji}</span>
            <span
              className="text-[8px] font-mono uppercase tracking-widest px-2 py-1 border rounded-sm"
              style={{
                color: realm.themeColor,
                borderColor: `${realm.themeColor}40`,
                background: `${realm.themeColor}10`,
              }}
            >
              {realm.category.replace("_", " ")}
            </span>
          </div>

          {/* Name */}
          <h3 className="font-display font-bold text-lg text-[var(--white)] mb-2 group-hover:text-[var(--paper)] transition-colors">
            {realm.name}
          </h3>

          {/* Description */}
          <p className="text-[var(--ash)] text-xs leading-relaxed mb-4 line-clamp-2">
            {realm.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={12} className="text-[var(--dim)]" />
              <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                {memberCount.toLocaleString()} souls
              </span>
            </div>

            <button
              onClick={handleToggleJoin}
              disabled={joining}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all",
                isJoined
                  ? "bg-[var(--surface)] text-[var(--ash)] border border-[var(--border)] hover:border-[var(--muted)]"
                  : "text-[var(--white)] hover:brightness-110",
              )}
              style={
                !isJoined
                  ? { background: realm.themeColor }
                  : {}
              }
            >
              {joining ? (
                "..."
              ) : isJoined ? (
                <>
                  <Check size={10} />
                  Joined
                </>
              ) : (
                <>
                  <Plus size={10} />
                  Enter
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ghost emoji */}
        <div className="absolute right-[-10px] bottom-[-15px] text-[100px] opacity-[0.03] select-none pointer-events-none" aria-hidden>
          {realm.emoji}
        </div>
      </motion.div>
    </Link>
  );
}
