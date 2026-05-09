/**
 * Realms — convex/realms.ts
 *
 * Themed rooms / channels ("Shadow Realms").
 * Queries & mutations for realm management.
 *
 * - listPublic: Browse public realms
 * - getBySlug: Fetch a realm by URL slug
 * - getMyRealms: Realms the user has joined
 * - joinRealm / leaveRealm: Toggle membership
 * - createRealm: Premium-only realm creation
 * - seedRealms: Internal — seed flagship realms
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/* ─── Queries ─────────────────────────────────────────────── */

/**
 * List all public realms, optionally filtered by category.
 */
export const listPublic = query({
  args: {
    category: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let realmsQuery;
    if (args.category && args.category !== "all") {
      realmsQuery = ctx.db
        .query("realms")
        .withIndex("by_category", (q) => q.eq("category", args.category!));
    } else {
      realmsQuery = ctx.db.query("realms");
    }

    const realms = await realmsQuery
      .filter((q) => q.eq(q.field("isPublic"), true))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    // Sort by member count descending
    realms.sort((a, b) => b.memberCount - a.memberCount);

    // Check membership for current user
    if (args.sessionId) {
      const memberships = await ctx.db
        .query("realmMemberships")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .collect();
      const joinedRealmIds = new Set(memberships.map((m) => m.realmId));

      return realms.map((r) => ({
        ...r,
        isJoined: joinedRealmIds.has(r._id),
      }));
    }

    return realms.map((r) => ({ ...r, isJoined: false }));
  },
});

/**
 * Get featured realms for the discovery page.
 */
export const getFeatured = query({
  args: { sessionId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const realms = await ctx.db
      .query("realms")
      .filter((q) => q.eq(q.field("isFeatured"), true))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    realms.sort((a, b) => b.memberCount - a.memberCount);

    if (args.sessionId) {
      const memberships = await ctx.db
        .query("realmMemberships")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .collect();
      const joinedRealmIds = new Set(memberships.map((m) => m.realmId));
      return realms.map((r) => ({ ...r, isJoined: joinedRealmIds.has(r._id) }));
    }
    return realms.map((r) => ({ ...r, isJoined: false }));
  },
});

/**
 * Fetch a single realm by slug.
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const realm = await ctx.db
      .query("realms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!realm) return null;

    let isJoined = false;
    if (args.sessionId) {
      const membership = await ctx.db
        .query("realmMemberships")
        .withIndex("by_session_realm", (q) =>
          q.eq("sessionId", args.sessionId!).eq("realmId", realm._id)
        )
        .first();
      isJoined = membership !== null;
    }

    // Count confessions in this realm
    const confessionCount = (
      await ctx.db
        .query("confessions")
        .withIndex("by_realm", (q) => q.eq("realmId", realm._id))
        .filter((q) => q.eq(q.field("isHidden"), false))
        .take(1000)
    ).length;

    return { ...realm, isJoined, confessionCount };
  },
});

/**
 * Get realms the current user has joined.
 */
export const getMyRealms = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("realmMemberships")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const realms = await Promise.all(
      memberships.map(async (m) => {
        const realm = await ctx.db.get(m.realmId);
        if (!realm || realm.isArchived) return null;
        return { ...realm, isJoined: true, joinedAt: m.joinedAt };
      })
    );

    return realms.filter((r) => r !== null);
  },
});

/* ─── Mutations ───────────────────────────────────────────── */

/**
 * Join a realm. Free users limited to 5 realms.
 */
export const joinRealm = mutation({
  args: {
    realmId: v.id("realms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already joined
    const existing = await ctx.db
      .query("realmMemberships")
      .withIndex("by_session_realm", (q) =>
        q.eq("sessionId", args.sessionId).eq("realmId", args.realmId)
      )
      .first();

    if (existing) return { joined: true, alreadyMember: true };

    // Check realm limit for free users
    const user = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!user?.isPremium) {
      const currentMemberships = await ctx.db
        .query("realmMemberships")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      if (currentMemberships.length >= 5) {
        throw new Error("Free users can join up to 5 realms. Upgrade to Inkognito Plus for unlimited.");
      }
    }

    // Join
    await ctx.db.insert("realmMemberships", {
      sessionId: args.sessionId,
      realmId: args.realmId,
      joinedAt: Date.now(),
    });

    // Increment member count
    const realm = await ctx.db.get(args.realmId);
    if (realm) {
      await ctx.db.patch(args.realmId, {
        memberCount: realm.memberCount + 1,
      });
    }

    return { joined: true, alreadyMember: false };
  },
});

/**
 * Leave a realm.
 */
export const leaveRealm = mutation({
  args: {
    realmId: v.id("realms"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("realmMemberships")
      .withIndex("by_session_realm", (q) =>
        q.eq("sessionId", args.sessionId).eq("realmId", args.realmId)
      )
      .first();

    if (!membership) return { left: false };

    await ctx.db.delete(membership._id);

    // Decrement member count
    const realm = await ctx.db.get(args.realmId);
    if (realm && realm.memberCount > 0) {
      await ctx.db.patch(args.realmId, {
        memberCount: realm.memberCount - 1,
      });
    }

    return { left: true };
  },
});

/**
 * Create a new realm. Premium users only.
 */
export const createRealm = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    description: v.string(),
    emoji: v.string(),
    category: v.string(),
    themeColor: v.string(),
    rules: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify premium
    const user = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!user?.isPremium) {
      throw new Error("Only Inkognito Plus members can create realms.");
    }

    // Validate name
    if (args.name.length < 3 || args.name.length > 50) {
      throw new Error("Realm name must be 3-50 characters.");
    }

    // Generate slug
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("realms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existingSlug) {
      throw new Error("A realm with a similar name already exists.");
    }

    const realmId = await ctx.db.insert("realms", {
      name: args.name,
      slug,
      description: args.description,
      emoji: args.emoji,
      category: args.category,
      themeColor: args.themeColor,
      rules: args.rules,
      creatorSessionId: args.sessionId,
      memberCount: 1,
      isPublic: true,
      isArchived: false,
      isFeatured: false,
      createdAt: Date.now(),
    });

    // Auto-join creator
    await ctx.db.insert("realmMemberships", {
      sessionId: args.sessionId,
      realmId,
      joinedAt: Date.now(),
    });

    return { realmId, slug };
  },
});

/* ─── Seed Data ───────────────────────────────────────────── */

const FLAGSHIP_REALMS = [
  // Culture & Location
  {
    name: "Lagos After Dark",
    slug: "lagos-after-dark",
    description: "Naija hustle, family pressure, village people stories. No pretending here.",
    emoji: "🌙",
    category: "culture",
    themeColor: "#e63946",
    bgGradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1515 50%, #0a0a0b 100%)",
    rules: "No doxxing family. Dark humor welcome. Keep it real.",
    isFeatured: true,
  },
  {
    name: "Nairobi Nights",
    slug: "nairobi-nights",
    description: "East African confessions under the stars. From Westlands to Kibera.",
    emoji: "🌍",
    category: "culture",
    themeColor: "#2a9d8f",
    bgGradient: "linear-gradient(135deg, #0a1a17 0%, #0d2b26 50%, #0a0a0b 100%)",
    rules: "Respect all tribes. No tribalism. Share your truth.",
    isFeatured: true,
  },
  {
    name: "Desi Family Secrets",
    slug: "desi-family-secrets",
    description: "Arranged marriages, family expectations, and everything between.",
    emoji: "🪷",
    category: "culture",
    themeColor: "#e9c46a",
    bgGradient: "linear-gradient(135deg, #1a150a 0%, #2d2415 50%, #0a0a0b 100%)",
    rules: "No judgment. Every family has layers.",
    isFeatured: true,
  },
  // Life Stage
  {
    name: "Campus Confessions",
    slug: "campus-confessions",
    description: "University life unfiltered. Exams, parties, breakdowns, breakthroughs.",
    emoji: "🎓",
    category: "life_stage",
    themeColor: "#457b9d",
    bgGradient: "linear-gradient(135deg, #0a0f1a 0%, #15233d 50%, #0a0a0b 100%)",
    rules: "No naming professors or specific schools. Stay anonymous.",
    isFeatured: true,
  },
  {
    name: "Corporate Shadows",
    slug: "corporate-shadows",
    description: "Office politics, quiet quitting, burnout confessions. The real 9-to-5.",
    emoji: "🏢",
    category: "life_stage",
    themeColor: "#6c757d",
    bgGradient: "linear-gradient(135deg, #0d0d0f 0%, #1a1a20 50%, #0a0a0b 100%)",
    rules: "No company names. Focus on feelings, not facts.",
    isFeatured: true,
  },
  {
    name: "Single in My 30s",
    slug: "single-in-my-30s",
    description: "Dating, loneliness, growth, and everything they don't tell you.",
    emoji: "💫",
    category: "life_stage",
    themeColor: "#b5838d",
    bgGradient: "linear-gradient(135deg, #1a0f12 0%, #2d1921 50%, #0a0a0b 100%)",
    isFeatured: false,
  },
  // Interest / Topic
  {
    name: "Love & Heartbreak",
    slug: "love-and-heartbreak",
    description: "The vault where romance goes to be honest. Photos prohibited.",
    emoji: "💔",
    category: "interest",
    themeColor: "#e63946",
    bgGradient: "linear-gradient(135deg, #1a0a0c 0%, #2d1218 50%, #0a0a0b 100%)",
    rules: "No photos. Text + AI art only. Fading encouraged.",
    isFeatured: true,
  },
  {
    name: "Healing from Religion",
    slug: "healing-from-religion",
    description: "Spiritual deconstruction, doubt, freedom, and finding yourself.",
    emoji: "🕊️",
    category: "interest",
    themeColor: "#a8dadc",
    bgGradient: "linear-gradient(135deg, #0a1315 0%, #152225 50%, #0a0a0b 100%)",
    rules: "Heavy moderation on hate. Respect all journeys.",
    isFeatured: true,
  },
  {
    name: "Midnight Philosophers",
    slug: "midnight-philosophers",
    description: "Deep existential thoughts. The kind that hit different at 3am.",
    emoji: "🌌",
    category: "interest",
    themeColor: "#7b2cbf",
    bgGradient: "linear-gradient(135deg, #0f0a1a 0%, #1a0f2d 50%, #0a0a0b 100%)",
    isFeatured: true,
  },
  {
    name: "Unsent Letters",
    slug: "unsent-letters",
    description: "Write to someone who'll never read it. Start with 'Dear ___'.",
    emoji: "✉️",
    category: "interest",
    themeColor: "#f4a261",
    bgGradient: "linear-gradient(135deg, #1a130a 0%, #2d2015 50%, #0a0a0b 100%)",
    rules: "Posts must start with 'Dear'. High echo potential.",
    isFeatured: true,
  },
  {
    name: "Dream Journal",
    slug: "dream-journal",
    description: "Nightmares, lucid dreams, recurring visions. What do they mean?",
    emoji: "🌀",
    category: "interest",
    themeColor: "#4361ee",
    bgGradient: "linear-gradient(135deg, #0a0c1a 0%, #121835 50%, #0a0a0b 100%)",
    isFeatured: false,
  },
  // Creative
  {
    name: "Alternate Life",
    slug: "alternate-life",
    description: "The life you wish you lived. No judgment, just imagination.",
    emoji: "🪞",
    category: "creative",
    themeColor: "#06d6a0",
    bgGradient: "linear-gradient(135deg, #0a1a15 0%, #0d2d24 50%, #0a0a0b 100%)",
    isFeatured: false,
  },
  {
    name: "9-5 Prisoners",
    slug: "9-5-prisoners",
    description: "Wage slave confessions. Cubicle rage. Lunch break breakdowns.",
    emoji: "⛓️",
    category: "creative",
    themeColor: "#adb5bd",
    bgGradient: "linear-gradient(135deg, #0d0d0f 0%, #1a1a1e 50%, #0a0a0b 100%)",
    isFeatured: false,
  },
  {
    name: "Immigrant Diaries",
    slug: "immigrant-diaries",
    description: "Third culture kids, diaspora struggles, the in-between life.",
    emoji: "🌊",
    category: "creative",
    themeColor: "#48cae4",
    bgGradient: "linear-gradient(135deg, #0a1218 0%, #0f2030 50%, #0a0a0b 100%)",
    rules: "Respect all origins. Share your truth.",
    isFeatured: true,
  },
];

export const seedRealms = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if realms already exist
    const existing = await ctx.db.query("realms").take(1);
    if (existing.length > 0) return { seeded: false, message: "Realms already exist." };

    for (const realm of FLAGSHIP_REALMS) {
      await ctx.db.insert("realms", {
        ...realm,
        creatorSessionId: undefined,
        memberCount: Math.floor(Math.random() * 200) + 50, // Seed with fake counts
        isPublic: true,
        isArchived: false,
        isFeatured: realm.isFeatured ?? false,
        createdAt: Date.now(),
      });
    }

    return { seeded: true, count: FLAGSHIP_REALMS.length };
  },
});
