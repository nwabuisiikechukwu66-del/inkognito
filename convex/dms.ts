/**
 * Direct Messages — convex/dms.ts
 *
 * Backend logic for 1-on-1 direct messaging.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all DMs for a user.
 */
export const getMyDMs = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const dmsA = await ctx.db
      .query("directMessages")
      .withIndex("by_participantA", (q) => q.eq("participantA", args.sessionId))
      .collect();

    const dmsB = await ctx.db
      .query("directMessages")
      .withIndex("by_participantB", (q) => q.eq("participantB", args.sessionId))
      .collect();

    const allDMs = [...dmsA, ...dmsB].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Fetch the other participant's username
    return await Promise.all(
      allDMs.map(async (dm) => {
        const otherId = dm.participantA === args.sessionId ? dm.participantB : dm.participantA;
        const otherUser = await ctx.db
          .query("anonUsers")
          .withIndex("by_session", (q) => q.eq("sessionId", otherId))
          .first();

        return {
          ...dm,
          otherSessionId: otherId,
          otherUsername: otherUser?.username || "Anon",
        };
      })
    );
  },
});

/**
 * Get messages in a specific DM thread.
 */
export const getMessages = query({
  args: { dmId: v.id("directMessages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dmMessages")
      .withIndex("by_dm", (q) => q.eq("dmId", args.dmId))
      .order("asc")
      .collect();
  },
});

/**
 * Start a new DM. Only Premium users can initiate.
 */
export const startDM = mutation({
  args: {
    initiatorSessionId: v.string(),
    targetSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.initiatorSessionId === args.targetSessionId) {
      throw new Error("You cannot DM yourself.");
    }

    const initiator = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.initiatorSessionId))
      .first();

    if (!initiator || !initiator.isPremium) {
      throw new Error("Only Premium users can initiate Direct Messages.");
    }

    // Check if DM already exists
    const existingA = await ctx.db
      .query("directMessages")
      .withIndex("by_participantA", (q) => q.eq("participantA", args.initiatorSessionId))
      .filter((q) => q.eq(q.field("participantB"), args.targetSessionId))
      .first();

    if (existingA) return existingA._id;

    const existingB = await ctx.db
      .query("directMessages")
      .withIndex("by_participantB", (q) => q.eq("participantB", args.initiatorSessionId))
      .filter((q) => q.eq(q.field("participantA"), args.targetSessionId))
      .first();

    if (existingB) return existingB._id;

    // Create new DM
    return await ctx.db.insert("directMessages", {
      participantA: args.initiatorSessionId,
      participantB: args.targetSessionId,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Send a message in a DM thread.
 */
export const sendMessage = mutation({
  args: {
    dmId: v.id("directMessages"),
    senderSessionId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const dm = await ctx.db.get(args.dmId);
    if (!dm) throw new Error("DM not found.");

    if (dm.participantA !== args.senderSessionId && dm.participantB !== args.senderSessionId) {
      throw new Error("You are not part of this DM.");
    }

    if (!args.content.trim()) throw new Error("Message cannot be empty.");

    await ctx.db.insert("dmMessages", {
      dmId: args.dmId,
      senderSessionId: args.senderSessionId,
      content: args.content.trim(),
      createdAt: Date.now(),
      isRead: false,
    });

    await ctx.db.patch(args.dmId, {
      lastMessageAt: Date.now(),
    });
  },
});
