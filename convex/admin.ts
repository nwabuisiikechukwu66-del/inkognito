/**
 * Admin — convex/admin.ts
 *
 * Global read queries and moderation actions for the admin dashboard.
 * Protected by a hardcoded secret for now.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
