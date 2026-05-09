/**
 * Realms Browser — app/realms/page.tsx
 *
 * "Enter the Shadows" — Cinematic realm discovery page.
 * Browse all public realms, filter by category, search.
 * Fully responsive grid layout.
 */

import type { Metadata } from "next";
import { RealmBrowser } from "./RealmBrowser";

export const metadata: Metadata = {
  title: "Shadow Realms",
  description: "Explore themed shadow realms — from Lagos After Dark to Midnight Philosophers. Find your void.",
};

export default function RealmsPage() {
  return <RealmBrowser />;
}
