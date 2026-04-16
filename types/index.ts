/**
 * types/index.ts
 *
 * Shared TypeScript types used across Inkognito.
 * Keeps component props and data shapes consistent.
 */

import { Id } from "@/convex/_generated/dataModel";

/* ── Confession ────────────────────────────────────────────── */
export type ConfessionCategory =
  | "sexual"
  | "relationship"
  | "dark"
  | "work"
  | "family"
  | "funny"
  | "other";

export type ReactionType = "fire" | "heart" | "shock" | "tears" | "dark";

export interface Confession {
  _id: Id<"confessions">;
  sessionId: string;
  content: string;
  category: ConfessionCategory;
  isNSFW: boolean;
  mediaUrl?: string;
  country?: string;
  city?: string;
  heatScore: number;
  viewCount: number;
  isModerated: boolean;
  isFlagged: boolean;
  isHidden: boolean;
  createdAt: number;
  // Enriched fields (added by query)
  reactionCount?: number;
  reactionCounts?: Record<ReactionType, number>;
  commentCount?: number;
}

export interface Comment {
  _id: Id<"comments">;
  confessionId: Id<"confessions">;
  sessionId: string;
  content: string;
  isHidden: boolean;
  createdAt: number;
}

/* ── Chat ──────────────────────────────────────────────────── */
export type ChatMode = "text" | "video";
export type ChatStatus = "waiting" | "active" | "ended";

export interface ChatSession {
  _id: Id<"chatSessions">;
  status: ChatStatus;
  mode: ChatMode;
  participantA: string;
  participantB?: string;
  countryA?: string;
  countryB?: string;
  createdAt: number;
  pairedAt?: number;
  endedAt?: number;
  myRole?: "A" | "B";
}

export interface ChatMessage {
  _id: Id<"chatMessages">;
  chatSessionId: Id<"chatSessions">;
  senderSessionId: string;
  content: string;
  type: "text" | "system";
  createdAt: number;
}

/* ── Companion ─────────────────────────────────────────────── */
export interface CompanionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
}

/* ── Anonymous User ────────────────────────────────────────── */
export interface AnonUser {
  _id: Id<"anonUsers">;
  sessionId: string;
  username?: string;
  country?: string;
  city?: string;
  createdAt: number;
  lastSeenAt: number;
  isBanned: boolean;
}

/* ── Feed ──────────────────────────────────────────────────── */
export type FeedSortBy = "recent" | "hot";

export interface FeedResult {
  confessions: Confession[];
  nextCursor: number | null;
}
