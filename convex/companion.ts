import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getHistory = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!args.sessionId) return [];
    return await ctx.db
      .query("companionChats")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const saveMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("companionChats", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const clearHistory = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("companionChats")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});
