/**
 * Notifications — convex/notifications.ts
 *
 * Server-side logic for in-app alerts.
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getRecent = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(50);
  },
});

export const getUnreadCount = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("sessionId", args.sessionId).eq("isRead", false))
      .collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { sessionId: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.notificationId);
    if (note && note.sessionId === args.sessionId) {
      await ctx.db.patch(args.notificationId, { isRead: true });
    }
  },
});

export const markAllRead = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("sessionId", args.sessionId).eq("isRead", false))
      .collect();
    for (const note of unread) {
      await ctx.db.patch(note._id, { isRead: true });
    }
  },
});

export const createInternal = internalMutation({
  args: {
    sessionId: v.string(),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
