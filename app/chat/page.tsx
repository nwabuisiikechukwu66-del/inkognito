/**
 * Chat Page — app/chat/page.tsx
 *
 * Omegle-style random chat with strangers.
 * Text and video via WebRTC.
 * Location-aware but identity-free.
 */

import type { Metadata } from "next";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Talk to a stranger from anywhere. Anonymous, real-time, no strings.",
};

export default function ChatPage() {
  return (
    <div className="container-ink py-10">
      {/* Page heading */}
      <div className="mb-8">
        <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-3">
          stranger mode
        </p>
        <h1 className="heading-editorial text-4xl text-[var(--white)] mb-3">
          Who&apos;s on the other end?
        </h1>
        <p className="text-[var(--ash)] text-sm max-w-md">
          Random. Anywhere. Anonymous. You&apos;ll never know who — and
          that&apos;s the point.
        </p>
      </div>

      {/* Chat room component — handles matching, WebRTC, messaging */}
      <ChatRoom />
    </div>
  );
}
