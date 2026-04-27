"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import webpush from "web-push";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const sendPush = internalAction({
  args: {
    sessionId: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.warn("VAPID keys not configured, skipping push notification.");
      return;
    }

    const { internal } = await import("./_generated/api");
    const sub = await ctx.runQuery(internal.push.getSubscription, { sessionId: args.sessionId });
    
    if (!sub) return;

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url ?? "/",
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error: any) {
      console.error("Error sending push notification", error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        await ctx.runMutation(internal.push.deleteSubscription, { id: sub._id });
      }
    }
  },
});
