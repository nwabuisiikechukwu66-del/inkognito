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

import { query, mutation, internalMutation } from "./_generated/server";
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
    sessionId: v.optional(v.string()),
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
        .withIndex("by_created")
        .filter((q) => q.eq(q.field("isHidden"), false));
    }

    // Sorting
    let confessions;
    if (sortBy === "hot") {
      confessions = await feedQuery.order("desc").take(100);
      // Sort by heatScore client-side (Convex doesn't support complex sort indexes)
      confessions.sort((a, b) => b.heatScore - a.heatScore);
      confessions = confessions.slice(0, limit);
    } else if (sortBy === "random") {
      // Fetch top 100 recent and shuffle
      confessions = await feedQuery.order("desc").take(100);
      confessions.sort(() => Math.random() - 0.5);
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

        // ── Poll Data ──
        let pollResults;
        if (c.poll) {
          const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_confession", (q) => q.eq("confessionId", c._id))
            .collect();
          const countA = votes.filter(v => v.option === "A").length;
          const countB = votes.filter(v => v.option === "B").length;
          const userVote = args.sessionId ? votes.find(v => v.sessionId === args.sessionId)?.option : undefined;
          pollResults = { countA, countB, total: votes.length, userVote };
        }

        // ── Comment Count (Publicly filtered) ──
        // Only count normal comments for the public count, or all if you're the author?
        // Let's count all comments the user can see.
        const visibleComments = comments.filter(comm => {
          if (comm.type === "whisper") {
            return args.sessionId === comm.sessionId || args.sessionId === c.sessionId;
          }
          return true;
        });

        // Remove location data before sending to client for privacy
        const { country, city, ...safeConfession } = c;

        return {
          ...safeConfession,
          authorUsername: author?.username,
          authorIsPremium: author?.isPremium ?? false,
          reactionCount: reactions.length,
          reactionCounts,
          commentCount: visibleComments.length,
          pollResults,
          shareCount: c.shareCount ?? 0,
          echoCount: (await ctx.db.query("echoes").withIndex("by_confession", (q) => q.eq("confessionId", c._id)).collect()).length,
          isBookmarked: args.sessionId ? (await ctx.db.query("bookmarks").withIndex("by_session_confession", (q) => q.eq("sessionId", args.sessionId!).eq("confessionId", c._id)).first() !== null) : false,
          isEchoed: args.sessionId ? (await ctx.db.query("echoes").withIndex("by_session_confession", (q) => q.eq("sessionId", args.sessionId!).eq("confessionId", c._id)).first() !== null) : false,
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
  args: { 
    id: v.id("confessions"),
    sessionId: v.optional(v.string()),
  },
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

    // ── Poll Data ──
    let pollResults;
    if (confession.poll) {
      const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_confession", (q) => q.eq("confessionId", args.id))
        .collect();
      const countA = votes.filter(v => v.option === "A").length;
      const countB = votes.filter(v => v.option === "B").length;
      const userVote = args.sessionId ? votes.find(v => v.sessionId === args.sessionId)?.option : undefined;
      pollResults = { countA, countB, total: votes.length, userVote };
    }

    // ── Filter Whispers ──
    const visibleComments = comments.filter(c => {
      if (c.type === "whisper") {
        return args.sessionId === c.sessionId || args.sessionId === confession.sessionId;
      }
      return true;
    });

    // Remove location data for privacy
    const { country, city, ...safeConfession } = confession;

    return {
      ...safeConfession,
      authorUsername: author?.username,
      authorIsPremium: author?.isPremium ?? false,
      reactionCount: reactions.length,
      reactionCounts,
      comments: visibleComments,
      pollResults,
      shareCount: confession.shareCount ?? 0,
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

/**
 * Get recent interactions (reactions/comments) on user's confessions.
 */
export const getNotifications = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get user's confessions
    const myConfessions = await ctx.db
      .query("confessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const confessionIds = myConfessions.map((c) => c._id);

    // 2. Get reactions on those confessions (excluding own)
    const reactions = await Promise.all(
      confessionIds.map((id) =>
        ctx.db
          .query("reactions")
          .withIndex("by_confession", (q) => q.eq("confessionId", id))
          .collect()
      )
    );

    // 3. Get comments on those confessions (excluding own)
    const comments = await Promise.all(
      confessionIds.map((id) =>
        ctx.db
          .query("comments")
          .withIndex("by_confession", (q) => q.eq("confessionId", id))
          .collect()
      )
    );

    const echoes = await Promise.all(
      confessionIds.map((id) =>
        ctx.db
          .query("echoes")
          .withIndex("by_confession", (q) => q.eq("confessionId", id))
          .collect()
      )
    );

    const pollVotes = await Promise.all(
      confessionIds.map((id) =>
        ctx.db
          .query("pollVotes")
          .withIndex("by_confession", (q) => q.eq("confessionId", id))
          .collect()
      )
    );

    // Flatten and enrich
    const notifications = [
      ...reactions.flat().filter((r) => r.sessionId !== args.sessionId).map((r) => ({
        type: "reaction",
        id: r._id,
        reactionType: r.type,
        confessionId: r.confessionId,
        createdAt: r.createdAt,
      })),
      ...comments.flat().filter((c) => c.sessionId !== args.sessionId).map((c) => ({
        type: "comment",
        id: c._id,
        confessionId: c.confessionId,
        content: c.content,
        createdAt: c.createdAt,
      })),
      ...echoes.flat().filter((e) => e.sessionId !== args.sessionId).map((e) => ({
        type: "echo",
        id: e._id,
        confessionId: e.confessionId,
        createdAt: e.createdAt,
      })),
      ...pollVotes.flat().filter((v) => v.sessionId !== args.sessionId).map((v) => ({
        type: "pollVote",
        id: v._id,
        confessionId: v.confessionId,
        option: v.option,
        createdAt: v.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    return notifications;
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
    poll: v.optional(v.object({
      question: v.string(),
      optionA: v.string(),
      optionB: v.string(),
    })),
    mood: v.optional(v.string()),
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
      shareCount: 0,
      isModerated: true,
      isFlagged: false,
      isHidden: false,
      createdAt: now,
      poll: args.poll,
      mood: args.mood,
    });

    return { id };
  },
});

/**
 * Toggle bookmark for a confession.
 */
export const toggleBookmark = mutation({
  args: {
    confessionId: v.id("confessions"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_session_confession", (q) =>
        q.eq("sessionId", args.sessionId).eq("confessionId", args.confessionId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    } else {
      await ctx.db.insert("bookmarks", {
        sessionId: args.sessionId,
        confessionId: args.confessionId,
        createdAt: Date.now(),
      });
      return { bookmarked: true };
    }
  },
});

/**
 * Toggle Echo (repost) for a confession.
 */
export const toggleEcho = mutation({
  args: {
    confessionId: v.id("confessions"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("echoes")
      .withIndex("by_session_confession", (q) =>
        q.eq("sessionId", args.sessionId).eq("confessionId", args.confessionId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("echoes", {
        sessionId: args.sessionId,
        confessionId: args.confessionId,
        createdAt: Date.now(),
      });
    }

    // Update heat score
    const confession = await ctx.db.get(args.confessionId);
    if (confession) {
      const echoes = await ctx.db
        .query("echoes")
        .withIndex("by_confession", (q) => q.eq("confessionId", args.confessionId))
        .collect();
      
      // Echoes weigh heavily on heat score
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_confession", (q) => q.eq("confessionId", args.confessionId))
        .collect();
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_confession", (q) => q.eq("confessionId", args.confessionId))
        .collect();

      const ageHours = (Date.now() - confession.createdAt) / (1000 * 60 * 60);
      const engagement = reactions.length * 3 + comments.length * 5 + confession.viewCount * 0.1 + echoes.length * 10;
      const gravity = 1.8;
      const newHeat = engagement / Math.pow(ageHours + 2, gravity);
      
      await ctx.db.patch(args.confessionId, { heatScore: newHeat });
    }

    return { echoed: !existing };
  },
});

/**
 * Get user's bookmarked confessions.
 */
export const getBookmarks = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    const confessions = await Promise.all(
      bookmarks.map(async (b) => {
        const c = await ctx.db.get(b.confessionId);
        if (!c || c.isHidden) return null;

        // Reuse enrichment logic (simplified for bookmarks)
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_confession", (q) => q.eq("confessionId", c._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_confession", (q) => q.eq("confessionId", c._id))
          .collect();

        const reactionCounts: Record<string, number> = {};
        for (const r of reactions) {
          reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
        }

        return {
          ...c,
          reactionCount: reactions.length,
          reactionCounts,
          commentCount: comments.length,
        };
      })
    );

    return confessions.filter((c) => c !== null);
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
    type: v.optional(v.string()), // "normal" | "whisper"
    isFading: v.optional(v.boolean()), // true = delete in 24h
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) throw new Error("Comment cannot be empty.");
    if (args.content.length > 500) throw new Error("Max 500 characters.");

    const now = Date.now();
    let expiresAt;
    if (args.isFading) {
      expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
    }

    await ctx.db.insert("comments", {
      confessionId: args.confessionId,
      sessionId: args.sessionId,
      content: args.content.trim(),
      type: args.type ?? "normal",
      expiresAt,
      isHidden: false,
      createdAt: now,
    });
  },
});

/**
 * Vote in a poll.
 */
export const voteInPoll = mutation({
  args: {
    confessionId: v.id("confessions"),
    sessionId: v.string(),
    option: v.string(), // "A" | "B"
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_session_confession", (q) => 
        q.eq("sessionId", args.sessionId).eq("confessionId", args.confessionId)
      )
      .first();
    
    if (existing) throw new Error("You have already voted.");

    await ctx.db.insert("pollVotes", {
      confessionId: args.confessionId,
      sessionId: args.sessionId,
      option: args.option,
      createdAt: Date.now(),
    });
  },
});

/**
 * Increment share count.
 */
export const incrementShare = mutation({
  args: { confessionId: v.id("confessions") },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.confessionId);
    if (!c) return;
    await ctx.db.patch(args.confessionId, {
      shareCount: (c.shareCount ?? 0) + 1,
    });
  },
});

/**
 * Internal: cleanup fading messages.
 */
export const cleanupFadingMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("comments")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    
    for (const msg of expired) {
      await ctx.db.delete(msg._id);
    }
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
/**
 * Seed sample data (Internal use).
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("confessions").take(1);
    if (existing.length > 0) return;

    const samples = [
      {
        content: "I once accidentally sent a 'Love you' text to my boss instead of my partner. I had to pretend it was meant for my cat named 'Boss'.",
        category: "funny",
        mood: "guilty",
        sessionId: "seed-session-1",
        isNSFW: false,
        heatScore: 10,
        viewCount: 100,
        isModerated: true,
        isFlagged: false,
        isHidden: false,
        createdAt: Date.now() - 1000 * 60 * 60,
      },
      {
        content: "I've been skipping the gym for 3 months but still post 'grind' stories using old photos. The guilt is real but the laziness is stronger.",
        category: "funny",
        mood: "relieved",
        sessionId: "seed-session-2",
        isNSFW: false,
        heatScore: 5,
        viewCount: 50,
        isModerated: true,
        isFlagged: false,
        isHidden: false,
        createdAt: Date.now() - 1000 * 60 * 120,
      },
      {
        content: "I'm in love with my best friend's sibling. It's tearing me apart because I don't want to ruin the friendship, but I can't stop thinking about them.",
        category: "relationship",
        mood: "sad",
        sessionId: "seed-session-3",
        isNSFW: false,
        heatScore: 25,
        viewCount: 200,
        isModerated: true,
        isFlagged: false,
        isHidden: false,
        createdAt: Date.now() - 1000 * 60 * 180,
      }
    ];

    for (const s of samples) {
      await ctx.db.insert("confessions", s);
    }
  },
});
