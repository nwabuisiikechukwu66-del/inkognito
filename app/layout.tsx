/**
 * Root Layout — app/layout.tsx
 *
 * Wraps the entire app with:
 * - ConvexClientProvider (real-time backend)
 * - AnonSessionProvider (anonymous identity management)
 * - Toaster (notifications)
 * - AgeGate (18+ gate rendered client-side)
 * - Global metadata + OG tags
 */

import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { AnonSessionProvider } from "@/components/providers/AnonSessionProvider";
import { Toaster } from "react-hot-toast";
import { AgeGate } from "@/components/ui/AgeGate";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "Inkognito — Speak Without a Face",
    template: "%s | Inkognito",
  },
  description:
    "Anonymous confessions, random connections, and an AI companion that never judges. Flow in. Stay hidden.",
  keywords: ["anonymous", "confessions", "random chat", "inkognito", "secrets"],
  openGraph: {
    title: "Inkognito — Speak Without a Face",
    description:
      "Anonymous confessions, random connections, and an AI companion that never judges.",
    type: "website",
    siteName: "Inkognito",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Inkognito",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkognito — Speak Without a Face",
    description: "Anonymous confessions, random connections.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Convex real-time provider wraps entire app */}
        <ConvexClientProvider>
          {/* Anonymous session management (UUID + location) */}
          <AnonSessionProvider>
            {/* 18+ age verification gate */}
            <AgeGate />

            {/* Top navigation */}
            <Navbar />

            {/* Page content */}
            <main className="min-h-screen">{children}</main>

            {/* Site footer — required for AdSense (Terms + Privacy links) */}
            <Footer />

            {/* Toast notifications — dark themed */}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#1a1a1f",
                  color: "#e8e0d5",
                  border: "1px solid #222228",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  borderRadius: "2px",
                },
                success: {
                  iconTheme: { primary: "#c41e3a", secondary: "#0a0a0b" },
                },
              }}
            />
          </AnonSessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
