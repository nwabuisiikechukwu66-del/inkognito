import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const saveSubscription = mutation({
  args: {
    sessionId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      if (existing.sessionId !== args.sessionId) {
        await ctx.db.patch(existing._id, { sessionId: args.sessionId });
      }
      return;
    }

    await ctx.db.insert("pushSubscriptions", {
      sessionId: args.sessionId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      createdAt: Date.now(),
    });
  },
});

export const getSubscription = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const deleteSubscription = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
