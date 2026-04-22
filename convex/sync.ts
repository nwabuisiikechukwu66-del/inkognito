/**
 * Device Sync — convex/sync.ts
 *
 * Handles generating and consuming ephemeral tokens for linking devices.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSyncToken = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();
    await ctx.db.insert("syncTokens", {
      token,
      sourceSessionId: args.sessionId,
      expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
      isConsumed: false,
    });
    return token;
  },
});

export const consumeSyncToken = mutation({
  args: { 
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const syncToken = await ctx.db
      .query("syncTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!syncToken) throw new Error("Invalid token.");
    if (syncToken.isConsumed) throw new Error("Token already used.");
    if (Date.now() > syncToken.expiresAt) throw new Error("Token expired.");

    // Consume the token
    await ctx.db.patch(syncToken._id, { isConsumed: true });

    // Return the sourceSessionId so the scanning device can adopt it
    return {
      sourceSessionId: syncToken.sourceSessionId,
    };
  },
});
