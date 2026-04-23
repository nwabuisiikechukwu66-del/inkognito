/**
 * Chat — convex/chat.ts
 *
 * Random stranger chat system.
 *
 * How pairing works:
 * 1. User calls joinQueue() → creates a "waiting" chatSession
 * 2. If another "waiting" session exists (not theirs), they get paired
 * 3. Both sides subscribe to chatSession via useQuery → detect pairing
 * 4. Messages sent via sendMessage(), delivered real-time via Convex subscriptions
 * 5. Either side calls leaveChat() → session marked "ended"
 *
 * WebRTC signaling:
 * - sendSignal() stores an offer/answer/ICE candidate
 * - getSignals() polls for unconsumed signals addressed to this user
 * - markSignalConsumed() marks them processed
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ─── Queries ─────────────────────────────────────────────── */

/**
 * Get the current chat session for a given session ID.
 * Returns active session (waiting or active) — not ended ones.
 */
export const getMyChatSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Check sessions where this user is participantA
    const asA = await ctx.db
      .query("chatSessions")
      .withIndex("by_participant", (q) =>
        q.eq("participantA", args.sessionId)
      )
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();

    if (asA) return { ...asA, myRole: "A" };

    // Check sessions where this user is participantB
    const asB = await ctx.db
      .query("chatSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("participantB"), args.sessionId),
          q.neq(q.field("status"), "ended")
        )
      )
      .first();

    if (asB) return { ...asB, myRole: "B" };

    return null;
  },
});

/**
 * Get all messages for a chat session.
 * Real-time — Convex pushes updates automatically.
 */
export const getMessages = query({
  args: { chatSessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) =>
        q.eq("chatSessionId", args.chatSessionId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Poll for WebRTC signals addressed to this user that haven't been consumed.
 */
export const getPendingSignals = query({
  args: {
    chatSessionId: v.id("chatSessions"),
    toSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("rtcSignals")
      .withIndex("by_recipient", (q) =>
        q.eq("toSessionId", args.toSessionId).eq("consumed", false)
      )
      .filter((q) =>
        q.eq(q.field("chatSessionId"), args.chatSessionId)
      )
      .collect();
  },
});

/* ─── Mutations ───────────────────────────────────────────── */

/**
 * Join the matching queue.
 * If a waiting partner exists → pair immediately.
 * Otherwise → create a waiting session.
 */
export const joinQueue = mutation({
  args: {
    sessionId: v.string(),
    mode: v.string(), // "text" | "video"
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Clean up any stale waiting sessions older than 5 minutes
    const stale = await ctx.db
      .query("chatSessions")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.lt(q.field("createdAt"), now - 5 * 60 * 1000))
      .collect();
    for (const s of stale) {
      await ctx.db.patch(s._id, { status: "ended" });
    }

    // Check if already in a session
    const existing = await ctx.db
      .query("chatSessions")
      .withIndex("by_participant", (q) =>
        q.eq("participantA", args.sessionId)
      )
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();
    if (existing) return { sessionId: existing._id, status: existing.status };

    // Look for a waiting partner (same mode, not yourself)
    const waiting = await ctx.db
      .query("chatSessions")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) =>
        q.and(
          q.eq(q.field("mode"), args.mode),
          q.neq(q.field("participantA"), args.sessionId)
        )
      )
      .first();


    if (waiting) {
      // Pair with the waiting user
      await ctx.db.patch(waiting._id, {
        status: "active",
        participantB: args.sessionId,
        countryB: args.country,
        pairedAt: now,
      });

      // System message
      await ctx.db.insert("chatMessages", {
        chatSessionId: waiting._id,
        senderSessionId: "system",
        content: "You're connected. Say hello.",
        type: "system",
        createdAt: now,
      });

      return { sessionId: waiting._id, status: "active", role: "B" };
    }

    // No partner — create waiting session
    const sessionId = await ctx.db.insert("chatSessions", {
      status: "waiting",
      mode: args.mode,
      participantA: args.sessionId,
      countryA: args.country,
      createdAt: now,
    });

    return { sessionId, status: "waiting", role: "A" };
  },
});

/**
 * Send a message in a chat session.
 * Validates sender is a participant.
 */
export const sendMessage = mutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    senderSessionId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) return;
    if (args.content.length > 1000) throw new Error("Max 1000 characters.");

    const session = await ctx.db.get(args.chatSessionId);
    if (!session || session.status !== "active") {
      throw new Error("Chat session is not active.");
    }

    // Verify sender is a participant
    const isParticipant =
      session.participantA === args.senderSessionId ||
      session.participantB === args.senderSessionId;
    if (!isParticipant) throw new Error("Not a participant in this session.");

    await ctx.db.insert("chatMessages", {
      chatSessionId: args.chatSessionId,
      senderSessionId: args.senderSessionId,
      content: args.content.trim(),
      type: "text",
      createdAt: Date.now(),
    });
  },
});

/**
 * Leave / end the current chat session.
 * Notifies partner via system message.
 */
export const leaveChat = mutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.chatSessionId);
    if (!session || session.status === "ended") return;

    await ctx.db.patch(args.chatSessionId, {
      status: "ended",
      endedAt: Date.now(),
    });

    await ctx.db.insert("chatMessages", {
      chatSessionId: args.chatSessionId,
      senderSessionId: "system",
      content: "The stranger has disconnected.",
      type: "system",
      createdAt: Date.now(),
    });
  },
});

/**
 * Send a WebRTC signaling message (offer, answer, ICE candidate).
 * Stored in DB and consumed by recipient in real-time.
 */
export const sendSignal = mutation({
  args: {
    chatSessionId: v.id("chatSessions"),
    fromSessionId: v.string(),
    toSessionId: v.string(),
    type: v.string(),    // "offer" | "answer" | "ice-candidate"
    payload: v.string(), // JSON-stringified SDP or ICE candidate
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rtcSignals", {
      ...args,
      consumed: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Mark WebRTC signals as consumed after processing.
 */
export const markSignalsConsumed = mutation({
  args: { signalIds: v.array(v.id("rtcSignals")) },
  handler: async (ctx, args) => {
    for (const id of args.signalIds) {
      await ctx.db.patch(id, { consumed: true });
    }
  },
});
