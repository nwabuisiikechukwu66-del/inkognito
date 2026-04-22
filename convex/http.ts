/**
 * HTTP Actions — convex/http.ts
 *
 * Convex HTTP actions handle API-style endpoints.
 *
 * Routes:
 * - POST /companion   : Stream AI companion response via Groq
 * - POST /moderation  : Trigger AWS Rekognition check on uploaded image
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/* ── Groq AI Companion ─────────────────────────────────────── */

/**
 * Streams a companion response from Groq (Llama 3.1-8B-Instant).
 *
 * Request body:
 * {
 *   messages: Array<{ role: "user" | "assistant", content: string }>,
 *   sessionId: string
 * }
 *
 * Returns: Server-Sent Events stream of text chunks.
 */
http.route({
  path: "/companion",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const { messages } = await request.json();

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return new Response("Groq API key not configured.", { status: 500 });
    }

    // System prompt: warm, therapeutic, non-judgmental companion
    const systemPrompt = `You are a compassionate, non-judgmental AI companion on Inkognito — an anonymous platform where people share their deepest thoughts.

Your role:
- Listen deeply and respond with warmth and empathy
- Never judge, shame, or moralize
- Reflect emotions back thoughtfully
- Offer perspective gently, not prescriptively
- Keep responses concise (2-4 sentences usually) unless the person clearly needs more
- You can be warm, even a little playful at times — this isn't a clinical setting
- If someone seems in serious distress, gently encourage professional support without being dismissive
- Never reveal you're built on any specific model

You don't remember past conversations. Each session is fresh. That's okay — meet them where they are.`;

    // Call Groq API with streaming
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Fast, free-tier friendly
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-20), // Keep last 20 messages for context window
          ],
          stream: true,
          max_tokens: 400,
          temperature: 0.8,
        }),
      }
    );

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      return new Response(`Groq error: ${err}`, { status: 502 });
    }

    // Forward the SSE stream directly to the client
    return new Response(groqResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

/* ── CORS preflight for companion ──────────────────────────── */
http.route({
  path: "/companion",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

/* ── Image Moderation (AWS Rekognition) ────────────────────── */

/**
 * Moderates an uploaded image URL using AWS Rekognition.
 * Called after a user uploads media — if flagged, hides the confession.
 *
 * Request body: { imageUrl: string, confessionId: string }
 */
http.route({
  path: "/moderation",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    // NOTE: Full AWS SDK integration requires setting up AWS credentials
    // in Convex environment variables. Implementation scaffolded here.
    // See README for setup instructions.

    const { imageUrl, confessionId } = await request.json();
    console.log(`Moderation check requested for confession: ${confessionId}, image: ${imageUrl}`);

    // TODO: Implement AWS Rekognition call
    // const rekognition = new RekognitionClient({ region: "us-east-1" });
    // const command = new DetectModerationLabelsCommand({ ... });

    return new Response(JSON.stringify({ status: "queued" }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/* ── Webhooks (Payments) ───────────────────────────────────── */

/**
 * Paystack Webhook
 * Updates user to premium on successful subscription.
 */
http.route({
  path: "/paystack-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // In production, verify the x-paystack-signature header here
    const payload = await request.json();
    
    if (payload.event === "charge.success" || payload.event === "subscription.create") {
      const sessionId = payload.data?.metadata?.session_id || payload.data?.customer?.metadata?.session_id;
      
      if (sessionId) {
        // Upgrade the user to premium using an internal mutation (or runQuery)
        // Since we are in an action, we run a mutation
        await ctx.runMutation(internal.users.upgradeToPremium, {
          sessionId,
          provider: "paystack",
          subscriptionId: payload.data.subscription_code || "sub_paystack_mock",
        });
      }
    }
    
    return new Response("OK", { status: 200 });
  }),
});

/**
 * Polar Webhook
 * Updates user to premium on successful subscription.
 */
http.route({
  path: "/polar-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // In production, verify the webhook signature here
    const payload = await request.json();
    
    if (payload.type === "subscription.created" || payload.type === "subscription.updated") {
      const sessionId = payload.data?.custom_field_data?.session_id;
      
      if (sessionId) {
        await ctx.runMutation(internal.users.upgradeToPremium, {
          sessionId,
          provider: "polar",
          subscriptionId: payload.data.id || "sub_polar_mock",
        });
      }
    }
    
    return new Response("OK", { status: 200 });
  }),
});

export default http;
