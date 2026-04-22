/**
 * Users — convex/users.ts
 *
 * Anonymous user/session management.
 * No email. No PII. Just UUID sessions + optional username.
 *
 * Flow:
 * 1. Client generates UUID on first visit → stored in localStorage
 * 2. Client calls upsertSession() on every page load
 * 3. Optionally: createAccount() to add a username+password
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/* ─── Queries ─────────────────────────────────────────────── */

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const checkUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("anonUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    return { available: !existing };
  },
});

/* ─── Mutations ───────────────────────────────────────────── */

/**
 * Upsert an anonymous session.
 * Called on every app load — creates if new, updates lastSeenAt if existing.
 */
export const upsertSession = mutation({
  args: {
    sessionId: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();
    const today = new Date(now).toISOString().split('T')[0];

    if (existing) {
      const lastSeen = new Date(existing.lastSeenAt).toISOString().split('T')[0];
      let newStreak = existing.streak ?? 1;

      if (lastSeen !== today) {
        const diffDays = Math.floor((now - existing.lastSeenAt) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      // Update last seen + location if provided
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        streak: newStreak,
        ...(args.country && { country: args.country }),
        ...(args.city && { city: args.city }),
      });
      return existing._id;
    }

    // Create new anon user
    return ctx.db.insert("anonUsers", {
      sessionId: args.sessionId,
      country: args.country,
      city: args.city,
      deviceFingerprint: args.deviceFingerprint,
      createdAt: now,
      lastSeenAt: now,
      isBanned: false,
      streak: 1,
    });
  },
});

/**
 * Create an optional account (username + hashed password).
 * No email required. Still fully anonymous.
 * Password hashing MUST be done client-side or in a Next.js API route
 * before calling this — Convex doesn't run Node crypto.
 */
export const createAccount = mutation({
  args: {
    sessionId: v.string(),
    username: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(args.username)) {
      throw new Error(
        "Username must be 3-20 characters, letters/numbers/underscores only."
      );
    }

    // Check uniqueness
    const taken = await ctx.db
      .query("anonUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (taken) throw new Error("Username already taken.");

    const existing = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!existing) throw new Error("Session not found.");
    if (existing.username) throw new Error("Account already created.");

    await ctx.db.patch(existing._id, {
      username: args.username,
      passwordHash: args.passwordHash,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to upgrade a user to premium via webhook.
 */
export const upgradeToPremium = internalMutation({
  args: {
    sessionId: v.string(),
    provider: v.string(),
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isPremium: true,
        paymentProvider: args.provider,
        subscriptionId: args.subscriptionId,
      });
    }
  },
});

/**
 * Set a custom username. Only allowed for premium users.
 */
export const setUsername = mutation({
  args: {
    sessionId: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(args.username)) {
      throw new Error(
        "Username must be 3-20 characters, letters/numbers/underscores only."
      );
    }

    const existing = await ctx.db
      .query("anonUsers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!existing) throw new Error("Session not found.");
    if (!existing.isPremium) throw new Error("Only premium users can set custom usernames.");

    // Check uniqueness
    const taken = await ctx.db
      .query("anonUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (taken && taken._id !== existing._id) throw new Error("Username already taken.");

    await ctx.db.patch(existing._id, {
      username: args.username,
    });

    return { success: true };
  },
});

/**
 * Get "Void Karma" — total engagement on all confessions.
 */
export const getKarma = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const confessions = await ctx.db
      .query("confessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (confessions.length === 0) return 0;

    let totalKarma = 0;
    const confessionIds = confessions.map(c => c._id);

    // Sum reactions
    for (const id of confessionIds) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_confession", (q) => q.eq("confessionId", id))
        .collect();
      totalKarma += reactions.length * 10; // 10 per reaction

      const comments = await ctx.db
        .query("comments")
        .withIndex("by_confession", (q) => q.eq("confessionId", id))
        .collect();
      totalKarma += comments.length * 25; // 25 per comment

      const echoes = await ctx.db
        .query("echoes")
        .withIndex("by_confession", (q) => q.eq("confessionId", id))
        .collect();
      totalKarma += echoes.length * 50; // 50 per echo
    }

    return totalKarma;
  },
});
