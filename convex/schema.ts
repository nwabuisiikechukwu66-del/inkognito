/**
 * Convex Schema — convex/schema.ts
 *
 * Tables:
 * - confessions   : Anonymous posts with reactions and metadata
 * - comments      : Comments on confessions
 * - reactions     : Heart/fire/shock reactions on confessions
 * - chatSessions  : Random chat pairing sessions
 * - chatMessages  : Messages within a chat session
 * - rtcSignals    : WebRTC signaling data (offer/answer/ICE candidates)
 * - reports       : Content moderation reports
 * - anonUsers     : Lightweight anonymous profiles (UUID-based)
 * - companionChats: AI companion messages for persistence
 * - directMessages: 1-on-1 private messaging sessions
 * - dmMessages    : Messages within direct messages
 * - syncTokens    : Ephemeral tokens for device linking
 * - bookmarks     : User saved confessions
 * - echoes        : Reposted confessions (unique name: Echo)
 *
 * Note: No email, no personal data beyond session UUID + rough location.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /* ── Anonymous Users ─────────────────────────────────────── */
  anonUsers: defineTable({
    sessionId: v.string(),       // UUID generated client-side, stored in localStorage
    username: v.optional(v.string()), // Optional chosen username (no email)
    passwordHash: v.optional(v.string()), // bcrypt hash if they created an account
    country: v.optional(v.string()),   // "NG", "US", etc.
    city: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()), // coarse fingerprint for abuse detection
    createdAt: v.number(),
    lastSeenAt: v.number(),
    isBanned: v.boolean(),
    banReason: v.optional(v.string()),
    // Premium & Monetization Additions
    isPremium: v.optional(v.boolean()),
    subscriptionId: v.optional(v.string()),
    paymentProvider: v.optional(v.string()), // 'paystack' | 'polar'
    chatAttemptsToday: v.optional(v.number()),
    lastChatReset: v.optional(v.number()),
    streak: v.optional(v.number()),
  }).index("by_session", ["sessionId"])
    .index("by_username", ["username"])
    .index("by_created", ["createdAt"]),


  /* ── Confessions ─────────────────────────────────────────── */
  confessions: defineTable({
    sessionId: v.string(),         // Author's anonymous session ID
    content: v.string(),           // The confession text (max 2000 chars)
    category: v.string(),          // "sexual" | "relationship" | "work" | "family" | "dark" | "funny" | "other"
    isNSFW: v.boolean(),           // Explicitly flagged as adult content
    mediaUrl: v.optional(v.string()), // Optional image (Cloudflare R2 URL)
    country: v.optional(v.string()), // Kept in DB for analytics, stripped for users
    city: v.optional(v.string()),    // Kept in DB for analytics, stripped for users
    heatScore: v.number(),         // Computed engagement score for trending sort
    viewCount: v.number(),
    isModerated: v.boolean(),      // Passed automated moderation
    isFlagged: v.boolean(),        // Flagged by users for review
    isHidden: v.boolean(),         // Hidden by admin
    poll: v.optional(v.object({
      question: v.string(),
      optionA: v.string(),
      optionB: v.string(),
    })),
    mood: v.optional(v.string()), // e.g., "guilty", "relieved", "seeking_advice"
    shareCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"])
    .index("by_heat", ["heatScore"])
    .index("by_session", ["sessionId"])
    .index("by_category", ["category"]),

  /* ── Comments ────────────────────────────────────────────── */
  comments: defineTable({
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    content: v.string(),           // Max 500 chars
    type: v.optional(v.string()),  // "normal" | "whisper"
    expiresAt: v.optional(v.number()), // For fading messages
    isHidden: v.boolean(),
    createdAt: v.number(),
  }).index("by_confession", ["confessionId"])
    .index("by_created", ["createdAt"]),

  /* ── Reactions ───────────────────────────────────────────── */
  reactions: defineTable({
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    type: v.string(),              // Expanded reaction types
    createdAt: v.number(),
  }).index("by_confession", ["confessionId"])
    .index("by_session_confession", ["sessionId", "confessionId"]),

  /* ── Chat Sessions (Random Pairing) ─────────────────────── */
  chatSessions: defineTable({
    status: v.string(),            // "waiting" | "active" | "ended"
    mode: v.string(),              // "text" | "video"
    participantA: v.string(),      // sessionId
    participantB: v.optional(v.string()), // sessionId of second person when paired
    countryA: v.optional(v.string()),
    countryB: v.optional(v.string()),
    createdAt: v.number(),
    pairedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_participant", ["participantA"]),

  /* ── Chat Messages ───────────────────────────────────────── */
  chatMessages: defineTable({
    chatSessionId: v.id("chatSessions"),
    senderSessionId: v.string(),
    content: v.string(),           // Text messages (max 1000 chars)
    type: v.string(),              // "text" | "system"
    createdAt: v.number(),
  }).index("by_session", ["chatSessionId"])
    .index("by_created", ["createdAt"]),

  /* ── WebRTC Signaling ────────────────────────────────────── */
  rtcSignals: defineTable({
    chatSessionId: v.id("chatSessions"),
    fromSessionId: v.string(),
    toSessionId: v.string(),
    type: v.string(),              // "offer" | "answer" | "ice-candidate"
    payload: v.string(),           // JSON stringified SDP or ICE candidate
    consumed: v.boolean(),         // Has the recipient processed this signal
    createdAt: v.number(),
  }).index("by_chat_session", ["chatSessionId"])
    .index("by_recipient", ["toSessionId", "consumed"]),

  /* ── Reports (Content Moderation) ───────────────────────── */
  reports: defineTable({
    targetId: v.string(),          // ID of confession/comment being reported
    targetType: v.string(),        // "confession" | "comment"
    reporterSessionId: v.string(),
    reason: v.string(),            // "spam" | "illegal" | "minors" | "harassment" | "other"
    note: v.optional(v.string()),
    status: v.string(),            // "pending" | "reviewed" | "dismissed"
    createdAt: v.number(),
  }).index("by_target", ["targetId"])
    .index("by_status", ["status"]),

  /* ── AI Companion Chats ──────────────────────────────────── */
  companionChats: defineTable({
    sessionId: v.string(),
    role: v.string(),              // "user" | "assistant"
    content: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  /* ── Direct Messages (1-on-1 Persistent) ─────────────────── */
  directMessages: defineTable({
    participantA: v.string(),      // sessionId
    participantB: v.string(),      // sessionId
    lastMessageAt: v.number(),
    createdAt: v.number(),
  }).index("by_participantA", ["participantA"])
    .index("by_participantB", ["participantB"]),

  dmMessages: defineTable({
    dmId: v.id("directMessages"),
    senderSessionId: v.string(),
    content: v.string(),
    createdAt: v.number(),
    isRead: v.boolean(),
  }).index("by_dm", ["dmId"]),

  /* ── Sync Tokens (QR Code Device Linking) ────────────────── */
  syncTokens: defineTable({
    token: v.string(),
    sourceSessionId: v.string(),
    expiresAt: v.number(),
    isConsumed: v.boolean(),
  }).index("by_token", ["token"]),

  /* ── Bookmarks ───────────────────────────────────────────── */
  bookmarks: defineTable({
    sessionId: v.string(),
    confessionId: v.id("confessions"),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_confession", ["sessionId", "confessionId"]),

  /* ── Echoes (Reposts) ────────────────────────────────────── */
  echoes: defineTable({
    sessionId: v.string(),
    confessionId: v.id("confessions"),
    createdAt: v.number(),
  }).index("by_confession", ["confessionId"])
    .index("by_session_confession", ["sessionId", "confessionId"]),

  /* ── Void Poll Votes ─────────────────────────────────────── */
  pollVotes: defineTable({
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    option: v.string(), // "A" | "B"
    createdAt: v.number(),
  }).index("by_confession", ["confessionId"])
    .index("by_session_confession", ["sessionId", "confessionId"]),

  /* ── Notifications ───────────────────────────────────────── */
  notifications: defineTable({
    sessionId: v.string(), // Recipient
    type: v.string(),      // "reaction" | "comment" | "dm" | "system"
    title: v.string(),
    content: v.string(),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_read", ["sessionId", "isRead"]),

  /* ── System Logs (For debugging crons/actions) ───────────── */
  systemLogs: defineTable({
    task: v.string(),      // e.g. "autopost"
    status: v.string(),    // "success" | "error"
    message: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["task"]),
});

