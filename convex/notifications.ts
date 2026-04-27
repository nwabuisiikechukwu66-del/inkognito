/**
 * Notifications — convex/notifications.ts
 *
 * Server-side logic for in-app alerts.
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

export const notifyActiveUsers = internalMutation({
  args: {
    type: v.string(),
    title: v.string(),
    content: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const activeSince = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const users = await ctx.db.query("anonUsers")
      .filter((q) => q.gte(q.field("lastSeenAt"), activeSince))
      .collect();
      
    // Safety limit to avoid transaction size errors in Convex
    const targets = users.slice(0, 5000); 
    
    for (const user of targets) {
      await ctx.db.insert("notifications", {
        sessionId: user.sessionId,
        type: args.type,
        title: args.title,
        content: args.content,
        link: args.link,
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.pushAction.sendPush, {
        sessionId: user.sessionId,
        title: args.title,
        body: args.content,
        url: args.link,
      });
    }
  },
});

export const notifyThreadParticipants = internalMutation({
  args: {
    confessionId: v.id("confessions"),
    triggerSessionId: v.string(),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const confession = await ctx.db.get(args.confessionId);
    if (!confession) return;
    
    const targetSessions = new Set<string>();
    
    if (confession.sessionId !== args.triggerSessionId) {
      targetSessions.add(confession.sessionId);
    }
    
    const comments = await ctx.db.query("comments")
      .withIndex("by_confession", (q) => q.eq("confessionId", args.confessionId))
      .collect();
      
    for (const c of comments) {
      if (c.sessionId !== args.triggerSessionId) {
        targetSessions.add(c.sessionId);
      }
    }
    
    const reactions = await ctx.db.query("reactions")
      .withIndex("by_confession", (q) => q.eq("confessionId", args.confessionId))
      .collect();
      
    for (const r of reactions) {
      if (r.sessionId !== args.triggerSessionId) {
        targetSessions.add(r.sessionId);
      }
    }
    
    for (const sessionId of targetSessions) {
      await ctx.db.insert("notifications", {
        sessionId,
        type: args.type,
        title: args.title,
        content: args.content,
        link: args.link,
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.pushAction.sendPush, {
        sessionId,
        title: args.title,
        body: args.content,
        url: args.link,
      });
    }
  },
});
