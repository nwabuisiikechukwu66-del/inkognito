/**
 * Admin — convex/admin.ts
 *
 * Global read queries and moderation actions for the admin dashboard.
 * Protected by a hardcoded secret for now.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";


const requireAdmin = (secret: string) => {
  const adminSecret = process.env.ADMIN_SECRET || "inkognito_admin_123";
  if (secret !== adminSecret) {
    throw new Error("Unauthorized");
  }
};

export const getStats = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    
    // Note: For a massive app, these should be pre-computed via Convex Cron jobs
    // but for v2 launch we can fetch them directly.
    const users = await ctx.db.query("anonUsers").order("desc").take(1000);
    const premiumUsers = users.filter(u => u.isPremium);
    const activeUsers = users.filter(u => u.lastSeenAt > Date.now() - 24 * 60 * 60 * 1000);
    
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
      
    const recentConfessions = await ctx.db.query("confessions").order("desc").take(50);
    
    return {
      totalUsers: users.length, // Sample of last 1000
      premiumUsers: premiumUsers.length,
      activeUsers24h: activeUsers.length,
      pendingReports: reports.length,
      recentConfessions,
    };
  },
});

export const hideConfession = mutation({
  args: { 
    secret: v.string(),
    confessionId: v.id("confessions"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.patch(args.confessionId, { isHidden: true });
  },
});

export const seedFeed = mutation({
  args: { 
    secret: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    
    // Trigger the background action
    await ctx.scheduler.runAfter(0, internal.autopost.generate, {
      count: args.count,
    });
    
    return { success: true, message: `Seeding ${args.count} posts in background...` };
  },
});

export const getSystemLogs = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    return ctx.db.query("systemLogs").order("desc").take(20);
  },
});

export const getReports = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    return ctx.db.query("reports").order("desc").take(50);
  },
});

export const flagConfession = mutation({
  args: { 
    secret: v.string(),
    confessionId: v.id("confessions"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.patch(args.confessionId, { isFlagged: true });
  },
});

export const updateReportStatus = mutation({
  args: { 
    secret: v.string(),
    reportId: v.id("reports"),
    status: v.string(), // "reviewed" | "dismissed"
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.patch(args.reportId, { status: args.status });
  },
});

export const restoreConfession = mutation({
  args: { 
    secret: v.string(),
    confessionId: v.id("confessions"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.patch(args.confessionId, { isHidden: false, isFlagged: false });
  },
});

export const banSession = mutation({
  args: { 
    secret: v.string(),
    sessionId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const user = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (user) {
      await ctx.db.patch(user._id, { isBanned: true, banReason: args.reason });
    }
  },
});

