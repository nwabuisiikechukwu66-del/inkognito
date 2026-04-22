/**
 * Moderation — convex/moderation.ts
 *
 * Admin-only queries and mutations for content moderation.
 *
 * In production, these should be protected by an admin check.
 * For now, add a secret token check using an environment variable.
 *
 * Queries:
 * - getPendingReports   : All unreviewed reports
 * - getFlaggedContent   : Confessions flagged by users
 *
 * Mutations:
 * - hideConfession      : Remove a confession from public feed
 * - dismissReport       : Mark a report as reviewed + dismissed
 * - banSession          : Ban a session ID from posting
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ── Secret admin token check ──────────────────────────────── */
/**
 * Simple admin guard: caller must pass the ADMIN_TOKEN env var.
 * Set ADMIN_TOKEN in your Convex dashboard env vars.
 */
function requireAdmin(token: string) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || token !== adminToken) {
    throw new Error("Unauthorized.");
  }
}

/* ─── Queries ─────────────────────────────────────────────── */

/** Get all pending (unreviewed) reports, newest first. */
export const getPendingReports = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    return ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(100);
  },
});

/** Get all confessions currently flagged by users. */
export const getFlaggedConfessions = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    return ctx.db
      .query("confessions")
      .filter((q) => q.eq(q.field("isFlagged"), true))
      .order("desc")
      .take(100);
  },
});

/** Get basic stats for the admin dashboard. */
export const getStats = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);

    const [confessions, reports, users] = await Promise.all([
      ctx.db.query("confessions").collect(),
      ctx.db.query("reports").collect(),
      ctx.db.query("anonUsers").collect(),
    ]);

    const pendingReports = reports.filter((r) => r.status === "pending").length;
    const hiddenConfessions = confessions.filter((c) => c.isHidden).length;
    const bannedUsers = users.filter((u) => u.isBanned).length;
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const todayConfessions = confessions.filter(
      (c) => c.createdAt > last24h
    ).length;
    const premiumUsers = users.filter((u) => u.isPremium).length;
    const activeUsers24h = users.filter((u) => u.lastSeenAt > last24h).length;

    return {
      totalConfessions: confessions.length,
      todayConfessions,
      hiddenConfessions,
      totalUsers: users.length,
      bannedUsers,
      pendingReports,
      totalReports: reports.length,
      premiumUsers,
      activeUsers24h,
    };
  },
});

/* ─── Mutations ───────────────────────────────────────────── */

/** Hide a confession from the public feed. */
export const hideConfession = mutation({
  args: {
    adminToken: v.string(),
    confessionId: v.id("confessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    await ctx.db.patch(args.confessionId, { isHidden: true });
  },
});

/** Restore a hidden confession. */
export const restoreConfession = mutation({
  args: {
    adminToken: v.string(),
    confessionId: v.id("confessions"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);
    await ctx.db.patch(args.confessionId, {
      isHidden: false,
      isFlagged: false,
    });
  },
});

/** Mark a report as reviewed (and optionally take action). */
export const reviewReport = mutation({
  args: {
    adminToken: v.string(),
    reportId: v.id("reports"),
    action: v.string(), // "dismiss" | "hide_content" | "ban_user"
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found.");

    await ctx.db.patch(args.reportId, { status: "reviewed" });

    if (args.action === "hide_content" && report.targetType === "confession") {
      await ctx.db.patch(report.targetId as any, { isHidden: true });
    }

    if (args.action === "ban_user") {
      const user = await ctx.db
        .query("anonUsers")
        .withIndex("by_session", (q) =>
          q.eq("sessionId", report.reporterSessionId)
        )
        .first();
      if (user) {
        await ctx.db.patch(user._id, {
          isBanned: true,
          banReason: `Report action: ${report.reason}`,
        });
      }
    }
  },
});

/** Ban a session from posting/chatting. */
export const banSession = mutation({
  args: {
    adminToken: v.string(),
    sessionId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminToken);

    const user = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        isBanned: true,
        banReason: args.reason,
      });
    }

    // Hide all their confessions
    const confessions = await ctx.db
      .query("confessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const c of confessions) {
      await ctx.db.patch(c._id, { isHidden: true });
    }
  },
});
