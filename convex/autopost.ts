/**
 * Autopost — convex/autopost.ts
 *
 * AI-driven system to seed the platform with diverse, raw human stories.
 * Generates content across various cultures and categories.
 */

import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { seedConfessions } from "./seedData";

const CATEGORIES = [
  "sexual", "relationship", "work", "family", "dark", "funny", "taboo", 
  "betrayal", "hustle", "regret", "spiritual", "travel"
];

const PERSONAS = [
  "Lagos hustler, 24, heavy Pidgin English, street-smart, describing a close call or a major win (raw, gritty)",
  "NYC night-shift nurse, 30s, exhausted, sharing a haunting encounter with a patient (clinical but emotional)",
  "Mumbai student, 21, intense pressure, confessing a secret love for someone in a rival community (vulnerable, poetic)",
  "London creative, 28, cynical, describing a bizarre encounter at a high-end club (witty, detached)",
  "Nairobi entrepreneur, 30, dealing with a betrayal in a business deal (sharp, intense)",
  "Berlin DJ, 25, mid-rave existential crisis or a drug-fueled realization (abstract, immersive)",
  "Tokyo salaryman, 40, formal but hiding a deep, disturbing obsession with a stranger (precise, haunting)",
  "Johannesburg student, 22, venting about a family secret involving traditional beliefs (conflicted, raw)",
  "Brooklyn artist, 29, describing a moment of intense connection with a stranger on the subway (raw, cinematic)",
  "Dubai luxury worker, 26, seeing the dark underbelly of wealth and confessing a theft (nervous, high-stakes)",
];

const COUNTRIES = ["NG", "US", "IN", "GB", "KE", "DE", "JP", "ZA", "AE", "FR", "CA", "GH"];
const USERNAMES = [
  "ShadowWalker", "LagosGhost", "MidnightSoul", "VoidSeeker", "CynicOne", 
  "EchoInTheDark", "LostLover", "StreetSaint", "BrokenHeart", "SilentHustle",
  "TheWatcher", "NightNurse", "CrimsonInk", "NeonDrifter", "DeepState"
];

export const generate = internalAction({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.error("GROQ_API_KEY not found in environment.");
      return;
    }

    const iterations = args.count ?? 1;

    for (let i = 0; i < iterations; i++) {
      // Pick random metadata
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      
      const prompt = `
        You are an anonymous user on Inkognito, a raw social network for secrets.
        Write a highly engaging, human, and authentic confession or story.
        Persona: ${persona}
        Category: ${category}
        Country: ${country}
        
        Requirements:
        1. Be raw and real. Use local slang, emotions, and minor imperfections.
        2. If the category is 'sexual' or 'taboo', be explicit, erotic, and raw.
        3. If it's 'dark' or 'regret', be brutally honest about things people usually hide.
        4. Length: Aim for 100-300 words.
        5. Do not sound like an AI. Do not use generic introductions. Start directly in the middle of the action or feeling.
        6. NO "As a..." or "I've always wondered...".
        7. Use formatting (line breaks) to make it look like a real mobile post.
        
        Format: Return ONLY the confession text. No metadata or commentary.
      `;

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.95,
            max_tokens: 1000,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status} ${JSON.stringify(data)}`);
        }

        const content = data.choices?.[0]?.message?.content?.trim();


        if (content) {
          await ctx.runMutation(internal.autopost.insertBotPost, {
            content,
            category,
            isNSFW: category === "sexual" || category === "taboo",
            country,
          });
        } else {
          throw new Error("Groq returned empty content.");
        }

      } catch (err: any) {
        console.error("Failed to generate bot confession:", err);
        await ctx.runMutation(internal.autopost.logStatus, {
          task: "autopost",
          status: "error",
          message: err.message || "Unknown Groq error",
        });
      }

      if (iterations > 1) await new Promise(r => setTimeout(r, 1000));
    }
  },
});

export const logStatus = internalMutation({
  args: { task: v.string(), status: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("systemLogs", { ...args, createdAt: Date.now() });
  },
});

export const insertBotPost = internalMutation({
  args: {
    content: v.string(),
    category: v.string(),
    isNSFW: v.boolean(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const botSessionId = `bot_${Math.random().toString(36).substring(7)}`;
    const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)] + Math.floor(Math.random() * 99);
    
    // Create the bot user so they have a username in the UI
    await ctx.db.insert("anonUsers", {
      sessionId: botSessionId,
      username,
      country: args.country,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      isBanned: false,
      isPremium: Math.random() > 0.8, // Some bots are premium
    });

    const confessionId = await ctx.db.insert("confessions", {
      sessionId: botSessionId,
      content: args.content,
      category: args.category,
      isNSFW: args.isNSFW,
      country: args.country,
      heatScore: Math.floor(Math.random() * 100),
      viewCount: Math.floor(Math.random() * 50),
      isModerated: true,
      isFlagged: false,
      isHidden: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert("systemLogs", {
      task: "autopost",
      status: "success",
      message: `Generated bot post in category: ${args.category}`,
      createdAt: Date.now(),
    });
    
    return confessionId;
  },
});

export const postNextSeed = internalAction({
  args: {},
  handler: async (ctx) => {
    const conf = seedConfessions[Math.floor(Math.random() * seedConfessions.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    
    const id = await ctx.runMutation(internal.autopost.insertBotPost, {
      content: conf.content,
      category: conf.category,
      isNSFW: conf.category === "sexual",
      country,
    });
    
    await ctx.runMutation(internal.notifications.notifyActiveUsers, {
      type: "system",
      title: "New Confession",
      content: `A new ${conf.category} confession was just posted to the void...`,
      link: `/c/${id}`,
    });
  }
});

