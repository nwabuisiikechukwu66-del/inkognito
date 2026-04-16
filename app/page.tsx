/**
 * Homepage — app/page.tsx
 *
 * The entry experience for Inkognito.
 * Shows a brief hero intro then drops directly into the confession feed.
 * No walls, no friction — just flow.
 */

import { Hero } from "@/components/layout/Hero";
import { FeedPage } from "@/components/feed/FeedPage";

export default function Home() {
  return (
    <>
      {/* Atmospheric hero — compact, editorial, gets out of the way */}
      <Hero />

      {/* Live confession feed — the heart of the app */}
      <FeedPage />
    </>
  );
}
