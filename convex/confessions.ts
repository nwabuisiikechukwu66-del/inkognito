/**
 * Confessions — convex/confessions.ts
 *
 * All queries and mutations for the confession feed.
 *
 * Queries:
 * - getFeed       : Paginated feed sorted by recency or heat
 * - getById       : Single confession with comment/reaction counts
 * - getByCategory : Filtered feed by category
 *
 * Mutations:
 * - post          : Post a new confession (anon, moderation checked)
 * - react         : Toggle a reaction on a confession
 * - incrementView : Bump view count (called client-side on mount)
 * - report        : Report a confession for moderation
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * Compute a "heat score" to rank trending confessions.
 * Simple decay function: reactions weighted more than views.
 * Score decays over time to keep feed fresh.
 *
 * @param reactions - total reaction count
 * @param views - total view count
 * @param comments - total comment count
 * @param ageHours - hours since posting
 */
function computeHeatScore(
  reactions: number,
  views: number,
  comments: number,
  ageHours: number
): number {
  const engagement = reactions * 3 + comments * 5 + views * 0.1;
  // Time decay: gravity = 1.8 (heavier = faster decay)
  const gravity = 1.8;
  return engagement / Math.pow(ageHours + 2, gravity);
}

/* ─── Queries ─────────────────────────────────────────────── */

/**
 * Get paginated confession feed.
 * sortBy: "recent" (default) or "hot"
 * cursor: createdAt timestamp for pagination (null = first page)
 */
export const getFeed = query({
  args: {
    sortBy: v.optional(v.string()),
    category: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const sortBy = args.sortBy ?? "recent";

    let feedQuery;
    if (args.category && args.category !== "all") {
      feedQuery = ctx.db
        .query("confessions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter((q) => q.eq(q.field("isHidden"), false));
    } else {
      feedQuery = ctx.db
        .query("confessions")
        .fullTableScan()
        .filter((q) => q.eq(q.field("isHidden"), false));
    }

    // Sorting
    let confessions;
    if (sortBy === "hot") {
      confessions = await feedQuery.order("desc").take(100);
      // Sort by heatScore client-side (Convex doesn't support complex sort indexes)
      confessions.sort((a, b) => b.heatScore - a.heatScore);
      confessions = confessions.slice(0, limit);
    } else {
      // Recent: use createdAt cursor for pagination
      if (args.cursor) {
        confessions = await feedQuery
          .order("desc")
          .filter((q) => q.lt(q.field("createdAt"), args.cursor!))
          .take(limit);
      } else {
        confessions = await feedQuery.order("desc").take(limit);
      }
    }

    // Enrich each confession with reaction and comment counts
    const enriched = await Promise.all(
      confessions.map(async (c) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_confession", (q) => q.eq("confessionId", c._id))
          .collect();

        const comments = await ctx.db
          .query("comments")
          .withIndex("by_confession", (q) => q.eq("confessionId", c._id))
          .filter((q) => q.eq(q.field("isHidden"), false))
          .collect();

        // Group reactions by type
        const reactionCounts: Record<string, number> = {};
        for (const r of reactions) {
          reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
        }

        const author = await ctx.db
          .query("anonUsers")
          .withIndex("by_session", (q) => q.eq("sessionId", c.sessionId))
          .first();

        // Remove location data before sending to client for privacy
        const { country, city, ...safeConfession } = c;

        return {
          ...safeConfession,
          authorUsername: author?.username,
          reactionCount: reactions.length,
          reactionCounts,
          commentCount: comments.length,
        };
      })
    );

    return {
      confessions: enriched,
      nextCursor:
        enriched.length === limit
          ? enriched[enriched.length - 1].createdAt
          : null,
    };
  },
});

/**
 * Get a single confession by ID, enriched with all reactions and comments.
 */
export const getById = query({
  args: { id: v.id("confessions") },
  handler: async (ctx, args) => {
    const confession = await ctx.db.get(args.id);
    if (!confession || confession.isHidden) return null;

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_confession", (q) => q.eq("confessionId", args.id))
      .collect();

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_confession", (q) => q.eq("confessionId", args.id))
      .filter((q) => q.eq(q.field("isHidden"), false))
      .order("asc")
      .collect();

    const reactionCounts: Record<string, number> = {};
    for (const r of reactions) {
      reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
    }

    const author = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", confession.sessionId))
      .first();

    // Remove location data for privacy
    const { country, city, ...safeConfession } = confession;

    return {
      ...safeConfession,
      authorUsername: author?.username,
      reactionCount: reactions.length,
      reactionCounts,
      comments,
    };
  },
});

/**
 * Get session user's own confessions.
 */
export const getMyConfessions = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("confessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(50);
  },
});

/* ─── Mutations ───────────────────────────────────────────── */

/**
 * Post a new anonymous confession.
 * Basic content moderation: blocked keywords list.
 * Heavy moderation (Rekognition) handled via HTTP action for media.
 */
export const post = mutation({
  args: {
    sessionId: v.string(),
    content: v.string(),
    category: v.string(),
    isNSFW: v.boolean(),
    mediaUrl: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Validation ──────────────────────────────────────────
    if (!args.content.trim()) throw new Error("Confession cannot be empty.");
    if (args.content.length > 2000)
      throw new Error("Max 2000 characters allowed.");

    // Basic keyword moderation — blocks obvious illegal content
    const BLOCKED_KEYWORDS = [
      "child porn", "cp ", "csam", "underage sex", "lolita",
      "kill myself", "suicide method",
    ];
    const lower = args.content.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
      if (lower.includes(keyword)) {
        throw new Error("Content violates community guidelines.");
      }
    }

    const now = Date.now();

    // ── Insert confession ────────────────────────────────────
    const id = await ctx.db.insert("confessions", {
      sessionId: args.sessionId,
      content: args.content.trim(),
      category: args.category,
      isNSFW: args.isNSFW,
      mediaUrl: args.mediaUrl,
      country: args.country,
      city: args.city,
      heatScore: 0,
      viewCount: 0,
      isModerated: true, // Passed basic check; deep check async
      isFlagged: false,
      isHidden: false,
      createdAt: now,
    });

    return { id };
  },
});

/**
 * Toggle a reaction on a confession.
 * If user already reacted with same type → remove it (toggle off).
 * If user reacted with different type → switch type.
 */
export const react = mutation({
  args: {
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const valid = [
      "fire", "heart", "shock", "tears", "dark",
      "flame", "zap", "droplets", "moon", "laugh", "skull", "handHeart", "angry", "eye"
    ];
    if (!valid.includes(args.type)) throw new Error("Invalid reaction type.");

    // Check existing reaction from this session
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_session_confession", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("confessionId", args.confessionId)
      )
      .first();

    if (existing) {
      if (existing.type === args.type) {
        // Same reaction → toggle off
        await ctx.db.delete(existing._id);
      } else {
        // Different reaction → switch
        await ctx.db.patch(existing._id, { type: args.type });
      }
    } else {
      // New reaction
      await ctx.db.insert("reactions", {
        confessionId: args.confessionId,
        sessionId: args.sessionId,
        type: args.type,
        createdAt: Date.now(),
      });
    }

    // Update heat score on the confession
    const confession = await ctx.db.get(args.confessionId);
    if (confession) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_confession", (q) =>
          q.eq("confessionId", args.confessionId)
        )
        .collect();
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_confession", (q) =>
          q.eq("confessionId", args.confessionId)
        )
        .collect();

      const ageHours =
        (Date.now() - confession.createdAt) / (1000 * 60 * 60);
      const newHeat = computeHeatScore(
        reactions.length,
        confession.viewCount,
        comments.length,
        ageHours
      );
      await ctx.db.patch(args.confessionId, { heatScore: newHeat });
    }
  },
});

/**
 * Increment view count when a confession is displayed.
 * Debounced client-side — only called once per session per confession.
 */
export const incrementView = mutation({
  args: { confessionId: v.id("confessions") },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.confessionId);
    if (!c) return;
    await ctx.db.patch(args.confessionId, {
      viewCount: c.viewCount + 1,
    });
  },
});

/**
 * Add a comment to a confession.
 */
export const addComment = mutation({
  args: {
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) throw new Error("Comment cannot be empty.");
    if (args.content.length > 500) throw new Error("Max 500 characters.");

    await ctx.db.insert("comments", {
      confessionId: args.confessionId,
      sessionId: args.sessionId,
      content: args.content.trim(),
      isHidden: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Report a confession or comment.
 */
export const report = mutation({
  args: {
    targetId: v.string(),
    targetType: v.string(),
    reporterSessionId: v.string(),
    reason: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("reports", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
