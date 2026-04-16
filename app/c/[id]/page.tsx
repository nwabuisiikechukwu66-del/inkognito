/**
 * Confession Detail Page — app/c/[id]/page.tsx
 *
 * Individual confession page.
 * - Full confession text displayed
 * - Dynamic OG meta tags for social sharing (snippet preview)
 * - Reactions + comments
 * - Share buttons for Twitter, WhatsApp, Telegram, copy link
 *
 * This is what gets shared when someone clicks "Share" on a card.
 * The OG preview shows only a snippet — the full confession is behind the link.
 */

import type { Metadata } from "next";
import { ConfessionDetail } from "@/components/feed/ConfessionDetail";

interface Props {
  params: { id: string };
  searchParams: { preview?: string };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const preview = searchParams.preview
    ? decodeURIComponent(searchParams.preview)
    : "Someone confessed something they could never say out loud.";

  return {
    title: "A confession on Inkognito",
    description: `"${preview}" — Read the full confession on Inkognito.`,
    openGraph: {
      title: "A confession on Inkognito",
      description: `"${preview}"`,
      type: "article",
      images: [{ url: "/og-confession.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary",
      title: "A confession on Inkognito",
      description: `"${preview}"`,
    },
  };
}

export default function ConfessionPage({ params }: Props) {
  return (
    <div className="container-ink py-12">
      <ConfessionDetail id={params.id} />
    </div>
  );
}
