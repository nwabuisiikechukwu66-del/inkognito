/**
 * ConvexClientProvider — components/providers/ConvexClientProvider.tsx
 *
 * Wraps the app with the Convex React provider.
 * Must be a client component ("use client") since it uses React context.
 *
 * SETUP: Set NEXT_PUBLIC_CONVEX_URL in your .env.local file.
 * Get it from your Convex dashboard after running `npx convex dev`.
 */

"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialize Convex client — singleton pattern for Next.js
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
