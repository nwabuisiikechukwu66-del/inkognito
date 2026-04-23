/**
 * Autopost — convex/autopost.ts
 *
 * AI-driven system to seed the platform with diverse, raw human stories.
 * Generates content across various cultures and categories.
 */

import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const CATEGORIES = ["sexual", "relationship", "work", "family", "dark", "funny", "other"];
const PERSONAS = [
  "Nigerian young adult in Lagos, uses heavy pidgin, street slang, and intense emotion (raw, unfiltered)",
  "American corporate executive hiding a double life, cynical and high-stakes (sophisticated, dark)",
  "Indian medical student under extreme pressure, venting about taboo desires (suppressed, intense)",
  "European artist traveling through Africa, feeling disconnected and hyper-observant (poetic, detached)",
  "African-American woman from Brooklyn, dealing with deep betrayal and street justice (fierce, real)",
  "South Asian laborer in the Middle East, homesick and describing a secret encounter (melancholic, raw)",
  "Latin American student in the US, struggling with identity and a hidden relationship (vulnerable, brave)",
  "Japanese salaryman with a secret obsession, very formal but deeply disturbed (precise, haunting)",
];

export const generate = internalAction({
  args: {},
  handler: async (ctx) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.error("GROQ_API_KEY not found in environment.");
      return;
    }

    // Pick random category and persona
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

    const prompt = `
      You are an anonymous user on Inkognito, a raw social network for secrets.
      Write a highly engaging, human, and authentic confession or story.
      Persona: ${persona}
      Category: ${category}
      
      Requirements:
      1. Be raw and real. Use local slang, emotions, and imperfections.
      2. If the category is 'sexual', be explicit, erotic, and raw (it's an anonymous platform).
      3. If it's 'dark', be truly honest about things people usually hide.
      4. Length: 50-1500 words.
      5. Do not sound like an AI. Do not use generic introductions like "I've been thinking...". Start mid-story.
      6. Focus on one specific incident or feeling.
      
      Format: Return ONLY the confession text. No metadata.
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
          temperature: 0.9,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      if (content) {
        // Post it to the database
        await ctx.runMutation(internal.autopost.insertBotPost, {
          content,
          category,
          isNSFW: category === "sexual",
        });
      }
    } catch (err) {
      console.error("Failed to generate bot confession:", err);
    }
  },
});

export const insertBotPost = internalMutation({
  args: {
    content: v.string(),
    category: v.string(),
    isNSFW: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Generate a fresh random sessionId to look like a new user
    const botSessionId = `bot_${Math.random().toString(36).substring(7)}`;
    
    await ctx.db.insert("confessions", {
      sessionId: botSessionId,
      content: args.content,
      category: args.category,
      isNSFW: args.isNSFW,
      heatScore: Math.floor(Math.random() * 50), // Give them a little head start
      viewCount: Math.floor(Math.random() * 10),
      isModerated: true,
      isFlagged: false,
      isHidden: false,
      createdAt: Date.now(),
    });
  },
});
