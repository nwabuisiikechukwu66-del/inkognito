/**
 * Crons — convex/crons.ts
 *
 * Scheduled tasks for Inkognito.
 */

import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// ── Autoposting ──────────────────────────────────────────────
// Generates a human-like confession every 6 minutes (10 per hour)
crons.interval(
  "generate-bot-confessions",
  { minutes: 12 },
  internal.autopost.generate,
  {} 
);

crons.interval(
  "post-seed-confession",
  { minutes: 2 },
  internal.autopost.postNextSeed,
  {}
);


// ── Maintenance ──────────────────────────────────────────────
// Optional: Clean up old signaling data or expired sync tokens
// crons.daily("cleanup", { hourUTC: 3, minuteUTC: 0 }, internal.maintenance.cleanup);

export default crons;
